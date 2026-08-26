import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("should_render_sidebar_with_gym_pos_title", () => {
    render(<App />);
    expect(screen.getByText("Gym POS")).toBeInTheDocument();
  });

  it("should_render_all_navigation_items", () => {
    render(<App />);
    expect(screen.getAllByTestId("nav-dashboard").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("nav-members").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("nav-finances").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("nav-reports").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("nav-settings").length).toBeGreaterThan(0);
  });

  it("should_navigate_to_members_page", async () => {
    render(<App />);
    await userEvent.click(screen.getAllByTestId("nav-members")[0]);
    expect(
      screen.getByRole("heading", { name: "Members" }),
    ).toBeInTheDocument();
  });

  it("should_navigate_to_settings_page", async () => {
    render(<App />);
    await userEvent.click(screen.getAllByTestId("nav-settings")[0]);
    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
  });
});
