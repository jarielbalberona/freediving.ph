import Image from "next/image";

export function AppLogo() {
  return (
    <div>
      <Image src="https://cdn.freediving.ph/images/freedivingph-blue-transparent.png" alt="Freediving Philippines" width={130} height={30} />
    </div>
  )
}

export default AppLogo;
