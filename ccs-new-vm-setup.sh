#!/bin/bash
# Created by: Hansraj Mali
# Email: hansraj.mali@hcl-software.com
# This script creates a ccsuser with Docker access and passwordless sudo for kill commands


set -e  # Exit on error

echo Remove login banner for Ubuntu

echo
chmod -x /etc/update-motd.d/*

echo
echo Create a product folder
rm -rf /product
mkdir /product

cd /product

echo
echo Install Docker
echo
apt-get update -y

apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

mkdir -p /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
echo
echo update daemon.json for registry access
echo
cat >> /etc/docker/daemon.json  << EOF
{
	"insecure-registries":["10.115.154.221:8080","10.134.56.237:8080","10.14.41.46:8080"]

}

EOF
echo
echo Docker Service restart
echo
service docker restart

echo
echo Install Docker Compose
echo
apt-get update -y
apt-get install -y docker-compose
echo

#docker build -t compose-v1 .

#cd /product
echo
#echo Install mysql client
echo
#apt install -y mysql-client-core-8.0 

echo Add hcluser to docker group

usermod -aG docker hcluser

echo '* soft nofile 1048576' | sudo tee -a /etc/security/limits.conf
echo '* hard nofile 1048576' | sudo tee -a /etc/security/limits.conf
echo '* soft nproc unlimited' | sudo tee -a /etc/security/limits.conf
echo '* hard nproc unlimited' | sudo tee -a /etc/security/limits.conf
echo 'root soft nproc unlimited' | sudo tee -a /etc/security/limits.conf
echo 'root hard nproc unlimited' | sudo tee -a /etc/security/limits.conf
echo 'root soft nofile 1048576' | sudo tee -a /etc/security/limits.conf
echo 'root hard nofile 1048576' | sudo tee -a /etc/security/limits.conf
echo 'session required pam_limits.so' | sudo tee -a /etc/pam.d/common-session
echo 'session required pam_limits.so' | sudo tee -a /etc/pam.d/common-session-noninteractive
echo 'fs.inotify.max_user_instances=1024' | sudo tee -a /etc/sysctl.conf
echo 'fs.inotify.max_user_watches=1048576' | sudo tee -a /etc/sysctl.conf
echo 'fs.file-max=2097152' | sudo tee -a /etc/sysctl.conf

echo
echo Docker Compose Automation Enviroment Setup Completed
echo
echo installing jq
apt install jq -y
# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "ERROR: This script must be run as root (use sudo)"
  echo "Usage: sudo bash $0"
  exit 1
fi

USERNAME="ccsuser"
echo "========================================"
echo "Setting up user: $USERNAME"
echo "========================================"
echo ""

# Check if user already exists
if id "$USERNAME" &>/dev/null; then
    echo "User $USERNAME already exists."
    read -p "Do you want to update permissions for existing user? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting without changes."
        exit 0
    fi
    USER_EXISTS=true
else
    USER_EXISTS=false
fi

# Create user if doesn't exist
if [ "$USER_EXISTS" = false ]; then
    echo "Creating user $USERNAME..."
    
    # Create user with home directory
    useradd -m -s /bin/bash "$USERNAME"
    
    if [ $? -eq 0 ]; then
        echo "User $USERNAME created successfully."
    else
        echo "ERROR: Failed to create user $USERNAME"
        exit 1
    fi
    
    # Set password for the user
    echo ""
    echo "Setting password for $USERNAME..."
    passwd "$USERNAME"
    
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to set password for $USERNAME"
        exit 1
    fi
    echo "Password set successfully."
else
    echo "Skipping user creation (user already exists)."
fi

echo ""
echo "========================================"
echo "Configuring Docker Access"
echo "========================================"

# Check if docker group exists
if ! getent group docker > /dev/null 2>&1; then
    echo "Docker group doesn't exist. Creating docker group..."
    groupadd docker
fi

# Add user to docker group
if groups "$USERNAME" | grep -q '\bdocker\b'; then
    echo "User $USERNAME is already in docker group."
else
    echo "Adding $USERNAME to docker group..."
    usermod -aG docker "$USERNAME"
    echo "User $USERNAME added to docker group successfully."
fi

echo ""
echo "========================================"
echo "Configuring Passwordless Sudo Permissions"
echo "========================================"

SUDOERS_FILE="/etc/sudoers.d/ccsuser-docker"

# Create sudoers file for ccsuser
echo "Creating sudoers configuration at $SUDOERS_FILE..."

cat > "$SUDOERS_FILE" << 'EOF'
# Allow ccsuser to run kill commands without password
# This is needed for container cleanup scripts
ccsuser ALL=(ALL) NOPASSWD: /bin/kill, /usr/bin/kill

# Allow ccsuser to delete any files and folders from /product directory without password
# This is needed for product cleanup operations
ccsuser ALL=(ALL) NOPASSWD: /bin/rm -rf /product/*, /usr/bin/rm -rf /product/*
ccsuser ALL=(ALL) NOPASSWD: /bin/rm /product/*, /usr/bin/rm /product/*

# Allow ccsuser to run docker commands without password (optional, only if docker needs sudo)
# Uncomment the line below if docker commands require sudo on your system
# ccsuser ALL=(ALL) NOPASSWD: /usr/bin/docker, /bin/docker
EOF

# Set correct permissions on sudoers file
chmod 440 "$SUDOERS_FILE"

# Verify sudoers syntax
echo "Verifying sudoers configuration..."
visudo -c -f "$SUDOERS_FILE"

if [ $? -eq 0 ]; then
    echo "Sudoers configuration is valid."
else
    echo "ERROR: Sudoers configuration has syntax errors!"
    rm -f "$SUDOERS_FILE"
    exit 1
fi

echo ""
echo "========================================"
echo "Verifying Configuration"
echo "========================================"

# Verify user exists
if id "$USERNAME" &>/dev/null; then
    echo "✓ User $USERNAME exists"
else
    echo "✗ User $USERNAME does not exist"
    exit 1
fi

# Verify docker group membership
if groups "$USERNAME" | grep -q '\bdocker\b'; then
    echo "✓ User $USERNAME is in docker group"
else
    echo "✗ User $USERNAME is NOT in docker group"
fi

# Verify sudoers file exists
if [ -f "$SUDOERS_FILE" ]; then
    echo "✓ Sudoers configuration file exists"
else
    echo "✗ Sudoers configuration file missing"
fi

# Show user info
echo ""
echo "User Information:"
echo "-----------------"
id "$USERNAME"
echo ""
echo "Groups: $(groups $USERNAME)"

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "User '$USERNAME' has been configured with:"
echo "  ✓ Home directory: /home/$USERNAME"
echo "  ✓ Docker access (member of docker group)"
echo "  ✓ Passwordless sudo for kill commands"
echo "  ✓ Passwordless sudo for deleting files and folders from /product directory"
echo ""
echo "IMPORTANT NOTES:"
echo "1. User $USERNAME needs to log out and log back in for docker group to take effect"
echo "   OR run: newgrp docker (in their session)"
echo ""
echo "2. Test docker access as $USERNAME:"
echo "   sudo -u $USERNAME docker ps"
echo ""
echo "3. Test passwordless sudo kill:"
echo "   sudo -u $USERNAME sudo -n kill -l"
echo ""
echo "4. Test passwordless sudo for product directory deletion:"
echo "   sudo -u $USERNAME sudo -n rm -rf /product/test_file"
echo ""
echo "5. To update the password later, run:"
echo "   sudo passwd $USERNAME"
echo ""
echo "6. The delete-environment.sh script should now be run as $USERNAME"
echo "   from your Node.js application"
echo ""
