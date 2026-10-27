import type { Metadata } from "next";
import { ServerWorkspace } from "./components/server-workspace";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "사이트 운영 현황", description: "서버별 호스팅, 트래픽과 점검 대상을 한곳에서 확인합니다." };
export default function HomePage() { return <ServerWorkspace />; }
