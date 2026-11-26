const PROCESS_FOLDER_URL = 'https://drive.google.com/drive/folders/0APzJPw6PlX9RUk9PVA';

const pendingDetails = (title: string) =>
  `No app-specific guide for ${title} was identified in the extracted Process documents. Open the shared Process Drive folder and add the current approved guide before relying on this entry for procedures.`;

const application = (
  id: string,
  title: string,
  description: string,
  url = PROCESS_FOLDER_URL,
  knowledgeText = description,
) => ({
  id,
  title,
  description,
  url,
  icon: '🔗',
  tags: 'Tools / Application',
  knowledgeText,
});

const applications = [
  application(
    'process-tool-salesforce',
    'Salesforce',
    'IBM Salesforce support console. The source notes IBM w3 authentication and includes training for case handling, contacts/accounts, Omni-Channel, timers/milestones, ARM, and knowledge articles.',
    'https://ibmsf.my.salesforce.com/console',
    'IBM Salesforce console: https://ibmsf.my.salesforce.com/console (IBM w3 authentication required). Internal Salesforce issues/RFEs: https://ibmsf.force.com/internal/s/login/. The Salesforce training source links the IBM Playbook training page at https://pages.github.ibm.com/merlin/playbook/#/playbook/training and covers support cases, contacts, accounts, Omni-Channel, case lifecycle, timers/milestones, ARM, and knowledge articles. Source: Important Links.docx and IBM SalesForce Training.docx.',
  ),
  application(
    'process-tool-ecurep',
    'EcuRep',
    'Customer file exchange process. To transfer a file to a host, the source says to select the file in EcuRep, choose “Transfer File to Host (FTP),” and select the approved HCL FTPS destination when prompted.',
    'https://support.hcltechsw.com/kb?id=kb_article&sysparm_article=KB0094348',
    'For customer file transfer, use the Data Handling - EcuRep process article: https://support.hcltechsw.com/kb?id=kb_article&sysparm_article=KB0094348. The archived guide says to select the file in EcuRep, choose “Transfer File to Host (FTP),” and verify the destination before transferring. Source: Transfering Files from EcuRep to Cudar.docx.',
  ),
  application(
    'process-tool-fix-central',
    'Fix Central',
    'The extracted links and procedure refer to IBM Fix Portal, not explicitly Fix Central. Confirm that these are the same tool for your team before following the archived Fix Portal steps.',
    'https://poktam2cl.iespc.ibm.com/rcs-testfix.ratl.swg.usma_s/cgi-bin/fix_portal.pl#show',
    'The provided export calls this IBM Fix Portal: https://poktam2cl.iespc.ibm.com/rcs-testfix.ratl.swg.usma_s/cgi-bin/fix_portal.pl#show. Its procedure covers locating a test fix by its unique ID and checking customer-facing case content. The export does not confirm that Fix Portal and Fix Central are the same application; verify this mapping before use. Source: Important Links.docx and Fix Portal Links & Contact.docx.',
  ),
  application('process-tool-partner-world', 'Partner World', pendingDetails('Partner World')),
  application(
    'process-tool-software-catalogue',
    'Software Catalogue',
    'The archived links include an IBM software access catalogue PDF and note that Rational License Key Center access uses a Partner Connect ID. Confirm this is the intended catalogue for your team.',
    'https://hclo365.sharepoint.com/sites/HCLPPThird-PartyTechnology/Shared%20Documents/GetSoftware/GetSoftware-IBMSoftwareAccessCatalog.pdf',
    'The archived Important Links document points to the IBM software access catalogue at https://hclo365.sharepoint.com/sites/HCLPPThird-PartyTechnology/Shared%20Documents/GetSoftware/GetSoftware-IBMSoftwareAccessCatalog.pdf and says Rational License Key Center access uses a Partner Connect ID. Verify current access instructions with the software owner. Source: Important Links.docx.',
  ),
  application(
    'process-tool-support-search',
    'Support Search',
    'The archived Support Search with Watson guide describes natural-language search, filters for document type/source/support mission, sorting, and Advanced Query Syntax. The guide is dated 2018; confirm the current interface.',
    PROCESS_FOLDER_URL,
    'The archived Support Search with Watson guide recommends running an initial search before enabling Options > Advanced Query Syntax. It describes filters for document type, source, and support mission, plus sorting and query examples such as text:("phrase1","phrase2"). The guide is dated 2018 and may not match the current interface. Source: Support Search with Watson.docx.',
  ),
  application(
    'process-tool-drupal',
    'Drupal',
    'IBM content authoring and technote publishing. The archived guide says to request peer review before submitting content for publishing.',
    'https://supportcontent.ibm.com',
    'The archived guide lists https://supportcontent.ibm.com and https://www-prd-trops.events.ibm.com/ for IBM Drupal content. It says to have a peer review a technote before submitting it for publication. The guide also references Drupal issue support through the IBM Salesforce internal support topic. Source: IBM Technotes - Drupal.docx.',
  ),
  application(
    'process-tool-global-protect-vpn',
    'Global Protect VPN',
    'The archived 2019 troubleshooting note addresses GlobalProtect remaining at “Connecting… Still Working”: restart the Windows PanGPS service. Verify current endpoint guidance with IT.',
    PROCESS_FOLDER_URL,
    'The archived GlobalProtect note says that when the client remains at “Connecting… Still Working,” stop and start the Windows PanGPS service. This is a 2019 troubleshooting note, not a complete VPN setup guide. Source: GlobalProtect.docx.',
  ),
  application('process-tool-ibm-slack', 'IBM Slack', pendingDetails('IBM Slack')),
  application(
    'process-tool-fyre-blue-diamond',
    'Fyre (Blue Diamond)',
    'The provided Blue Diamond guide covers accessing customer-uploaded case files through approved Blue Diamond resources. It warns that older mapped-drive instructions may be outdated.',
    'https://w3.ibm.com/support/csp-playbook/#/documents/78f52cc9789a56af1cc0d317a76c5c24',
    'The archived Blue Diamond guide describes accessing customer-uploaded files using an approved Citrix Standard Blue Diamond desktop or the documented download site. It notes that older H: drive mapping instructions may no longer work and may be outdated. Follow current Blue Diamond training and security requirements. Source: How To Access Blue Diamond Files (2025-12-31).docx.',
  ),
  application(
    'process-tool-servicenow',
    'ServiceNow',
    'HCL support portal for incidents and knowledge articles. The archived process says to peer-review knowledge articles before publication.',
    'https://support.hcltechsw.com/',
    'The archived guides use the HCL support portal to create incidents, including CuDaR support requests. The ServiceNow knowledge article guide says to have a peer review an article before publishing. Source: Open CuDaR Support Request or RFE.docx and HCL Articles - ServiceNow.docx.',
  ),
  application(
    'process-tool-on-call-scheduler',
    'On-Call Scheduler',
    'The archived links identify IBM PagerDuty for standby-duty notifications and note that IBM w3 authentication is required. Confirm whether this is the intended On-Call Scheduler.',
    'https://ibm.pagerduty.com',
    'The archived Important Links document identifies IBM PagerDuty at https://ibm.pagerduty.com for standby-duty notifications and notes that IBM w3 authentication is required. Source: Important Links.docx.',
  ),
  application(
    'process-tool-chcls-cq',
    'CHCLS (CQ)',
    'The archived guide describes subscribing to UrbanCode ticket notifications and querying open tickets in ClearQuest. It requires HCL VPN and is dated 2018; verify current access and procedures.',
    'https://njdc-cqsrv01.prod.hclpnp.com/cqweb/',
    'The archived CHCLS guide connects through HCL VPN to https://njdc-cqsrv01.prod.hclpnp.com/cqweb/, selects repository PNP-HCL-CQPROD, and describes subscribing to “New Ticket for UrbanCode” and querying open UrbanCode tickets. The source is dated 2018; verify current procedures. Source: How to work with CHCLS.docx.',
  ),
  application(
    'process-tool-cudar',
    'CuDaR',
    'The archived guide says to create a new incident in the HCL support portal and select the CuDaR application. It warns that a referenced KB article contains incorrect values.',
    'https://support.hcltechsw.com/nav_to.do',
    'To open a CuDaR support request, the archived guide directs users to the HCL support portal, filter for Incident, choose Create New, and select the CuDaR application. It warns that the referenced KB article has incorrect values to select, so confirm the correct values with the current support owner. Source: Open CuDaR Support Request or RFE.docx.',
  ),
  application('process-tool-cisco-webex', 'Cisco Webex', pendingDetails('Cisco Webex')),
  application('process-tool-mhs', 'MHS', pendingDetails('MHS')),
  application('process-tool-digital-connect', 'Digital Connect', pendingDetails('Digital Connect')),
  application(
    'process-tool-mycloud',
    'Mycloud',
    'The export contains a MyCloud FAQ about VM access and infrastructure support, but it is dated 2018 and includes outdated notes. Verify current procedures with the MyCloud support team.',
    PROCESS_FOLDER_URL,
    'The archived MyCloud FAQ includes Linux VM and repository information. It explicitly says the CHCLS support information is outdated, so do not treat the archived steps as current without verification from the MyCloud support team. Source: FAQ - MyCloud.docx.',
  ),
  application('process-tool-cloud-craft-studio', 'Cloud Craft Studio', pendingDetails('Cloud Craft Studio')),
  application('process-tool-cato-client', 'Cato client', pendingDetails('Cato client')),
  application('process-tool-ms-teams', 'MS Teams', pendingDetails('MS Teams')),
  application('process-tool-gotowebinar', 'GoToWebinar', pendingDetails('GoToWebinar')),
  application('process-tool-discourse', 'Discourse', pendingDetails('Discourse')),
  application('process-tool-gws', 'GWS', pendingDetails('GWS')),
  application(
    'process-tool-jira',
    'Jira',
    'The archived links identify HCL Jira for internal defects and note that HCL VPN is required. They also point to the Application Access Management request path for access issues.',
    'https://jira01.hclpnp.com/secure/Dashboard.jsp',
    'HCL Jira: https://jira01.hclpnp.com/secure/Dashboard.jsp (HCL VPN required). The archived guide says to use Jira for internal defects and request lost access through the IT service portal under Application Access Management. Source: Important Links.docx.',
  ),
  application('process-tool-outlook', 'Outlook', pendingDetails('Outlook')),
  application('process-tool-qualtrics', 'Qualtrics', pendingDetails('Qualtrics')),
  application('process-tool-ibm-ideas', 'IBM Ideas', pendingDetails('IBM Ideas')),
  application('process-tool-hcl-ideas-portal', 'HCL Ideas portal', pendingDetails('HCL Ideas portal')),
  application('process-tool-ibm-box', 'IBM Box', pendingDetails('IBM Box')),
  application('process-tool-aha', 'Aha', pendingDetails('Aha')),
];

export const PROCESS_APPLICATIONS = applications.map((item, index) => ({
  ...item,
  order: 1000 + index,
}));