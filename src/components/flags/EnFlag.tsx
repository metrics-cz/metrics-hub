// src/components/flags/EnFlag.tsx
export default function EnFlag(props: any) {
 return (
  <img
   {...props}
   src="/flags/en.svg"
   alt="English flag"
   className="object-scale-down w-5 h-5"
  />
 );
}