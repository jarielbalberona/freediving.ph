import Image from "next/image";

export function AppLogo() {
  return (
    <div>
      <Image src="https://cdn.freediving.ph/freediving.ph.png" alt="Freediving Philippines" width={130} height={30} />
    </div>
  )
}

export default AppLogo;
