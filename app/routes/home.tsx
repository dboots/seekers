import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Seekers Solo Mode" },
    { name: "description", content: "The solo mode for Seekers" },
  ];
}

export default function Home() {
  return <Welcome />;
}
