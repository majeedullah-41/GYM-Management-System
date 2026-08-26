import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("should_render_application_title", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Gym POS" })).toBeInTheDocument();
  });
});
