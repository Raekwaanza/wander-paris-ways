import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { getScenicPublicWebOrigin, isNativeRuntime } from "@/lib/platform-runtime";
import { startNativeDeepLinkHandling } from "@/lib/scenic/native-deep-links";

export function NativeDeepLinkBoundary() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeRuntime()) return;
    let publicWebOrigin: string | null;
    try {
      publicWebOrigin = getScenicPublicWebOrigin();
    } catch (error) {
      console.error("Native deep-link origin is invalid", error);
      return;
    }
    if (!publicWebOrigin) return;
    const subscription = startNativeDeepLinkHandling({
      publicWebOrigin,
      onLink: ({ token }) => {
        void router.navigate({ to: "/shared", hash: `r=${token}` });
      },
    });
    return () => void subscription.dispose();
  }, [router]);

  return null;
}
