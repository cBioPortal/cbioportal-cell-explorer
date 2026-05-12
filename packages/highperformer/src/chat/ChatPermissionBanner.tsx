import { Alert } from "antd";

export function ChatPermissionBanner({ reason }: { reason: string }) {
  if (reason === "requires_auth") {
    return (
      <Alert
        type="info"
        showIcon
        title="Sign in to use chat"
        description={
          <>
            Chat requires an authenticated session.{" "}
            <a href="/api/auth/login">Sign in</a> to continue.
          </>
        }
      />
    );
  }
  if (reason.startsWith("missing_role:")) {
    const role = reason.slice("missing_role:".length);
    return (
      <Alert
        type="info"
        showIcon
        title="Chat access required"
        description={
          <>
            Chat requires the <code>{role}</code> role. Contact your
            administrator to request access.
          </>
        }
      />
    );
  }
  // Fallback for future reason codes
  return (
    <Alert
      type="info"
      showIcon
      title="Chat is not available"
      description="Chat is not available for your account on this dataset."
    />
  );
}
