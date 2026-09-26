import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../components/feedback/ToastProvider";
import { RestoreBackupSection } from "./RestoreBackupSection";

const mocks = vi.hoisted(() => ({
  selectBackupFile: vi.fn(),
  restoreBackup: vi.fn(),
}));

vi.mock("../../../lib/api/settings", () => ({
  selectBackupFile: mocks.selectBackupFile,
  restoreBackup: mocks.restoreBackup,
}));

const BACKUP_PATH = "C:\\GymBackups\\GymBackup-daily-20260101-090000.db";

function renderSection(onRestored = vi.fn()) {
  render(
    <ToastProvider>
      <RestoreBackupSection onRestored={onRestored} />
    </ToastProvider>,
  );
  return onRestored;
}

async function openConfirmation(typed: string) {
  await userEvent.click(screen.getByRole("button", { name: /restore this backup/i }));
  await userEvent.type(screen.getByLabelText(/admin password/i), typed);
}

describe("RestoreBackupSection", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cannot restore until a backup file is chosen", () => {
    renderSection();
    expect(screen.getByRole("button", { name: /restore this backup/i })).toBeDisabled();
  });

  it("sends the chosen file with the admin password", async () => {
    mocks.selectBackupFile.mockResolvedValue(BACKUP_PATH);
    mocks.restoreBackup.mockResolvedValue({
      source: BACKUP_PATH,
      safetyBackup: "C:\\GymBackups\\GymBackup-manual-20260102-101500.db",
    });
    const onRestored = renderSection();

    await userEvent.click(screen.getByRole("button", { name: /browse/i }));
    expect(await screen.findByDisplayValue(BACKUP_PATH)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /restore this backup/i }));
    const confirm = screen.getByRole("button", { name: /restore and sign out/i });
    expect(confirm).toBeDisabled();
    expect(mocks.restoreBackup).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText(/admin password/i), "admin123");
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);

    await waitFor(() =>
      expect(mocks.restoreBackup).toHaveBeenCalledWith(BACKUP_PATH, "admin123"),
    );
    expect(await screen.findByText("Backup restored")).toBeInTheDocument();
    expect(onRestored).toHaveBeenCalled();
  });

  it("reports a rejected password and keeps the current data", async () => {
    mocks.selectBackupFile.mockResolvedValue(BACKUP_PATH);
    mocks.restoreBackup.mockRejectedValue(
      new Error("Validation error: Incorrect password"),
    );
    const onRestored = renderSection();

    await userEvent.click(screen.getByRole("button", { name: /browse/i }));
    await screen.findByDisplayValue(BACKUP_PATH);
    await openConfirmation("wrong-password");
    await userEvent.click(screen.getByRole("button", { name: /restore and sign out/i }));

    expect(await screen.findByText(/incorrect password/i)).toBeInTheDocument();
    expect(onRestored).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /restore and sign out/i })).toBeInTheDocument();
  });

  it("reports a rejected backup and stays signed in", async () => {
    mocks.selectBackupFile.mockResolvedValue(BACKUP_PATH);
    mocks.restoreBackup.mockRejectedValue(
      new Error("Validation error: The selected file is not a Gym POS backup"),
    );
    const onRestored = renderSection();

    await userEvent.click(screen.getByRole("button", { name: /browse/i }));
    await screen.findByDisplayValue(BACKUP_PATH);
    await openConfirmation("admin123");
    await userEvent.click(screen.getByRole("button", { name: /restore and sign out/i }));

    expect(
      await screen.findByText(/the selected file is not a gym pos backup/i),
    ).toBeInTheDocument();
    expect(onRestored).not.toHaveBeenCalled();
  });

  it("keeps the confirmation closed when the picker is cancelled", async () => {
    mocks.selectBackupFile.mockResolvedValue(null);
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: /browse/i }));

    expect(mocks.selectBackupFile).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /restore this backup/i })).toBeDisabled();
  });
});
