// Cloudflare injects these variables in Workers Builds. Work branches must not
// replace the public Worker until their changes have been reviewed and merged.
export function assertBuildAllowed(env = process.env) {
  if (env.WORKERS_CI === "1" && env.WORKERS_CI_BRANCH !== "main") {
    throw new Error(
      "Publication stopped: Cloudflare work-branch builds are disabled. " +
        "The existing public version is preserved. Review and merge into main " +
        "before enabling a controlled production release in Cloudflare.",
    );
  }
}
