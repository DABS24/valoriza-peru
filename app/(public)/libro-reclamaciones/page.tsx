import LegalDoc from "@/components/portales/LegalDoc";
import { COPY } from "@/lib/copy";

const T = COPY.legal.libro;
export const metadata = { title: T.titulo };

export default function Page() {
  return <LegalDoc titulo={T.titulo} intro={T.intro} secciones={T.secciones} nota={T.nota} />;
}
