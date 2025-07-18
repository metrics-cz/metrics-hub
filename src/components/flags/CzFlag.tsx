// src/components/flags/CzFlag.tsx
export default function CzFlag(props: any) {
  return (
    <img
      {...props}
      src="/flags/cz.svg"
      alt="Czech flag"
      className="object-scale-down w-5 h-5"
    />
  );
}