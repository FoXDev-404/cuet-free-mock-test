import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CUETFreeMockTest — Free CUET (UG) Mock Tests & Practice",
    short_name: "CUETFreeMockTest",
    description: "Practice CUET questions, take mock tests, and review your progress.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4338ca",
  };
}
