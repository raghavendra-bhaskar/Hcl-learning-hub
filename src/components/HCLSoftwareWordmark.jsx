export default function HCLSoftwareWordmark({ className = '', textClassName = '' }) {
  return (
    <span className={`inline-flex items-baseline leading-none ${className}`}>
      <span className={`font-black tracking-[-0.08em] ${textClassName}`}>HCL</span>
      <span className={`font-black tracking-[-0.08em] ${textClassName}`}>Software</span>
    </span>
  );
}
