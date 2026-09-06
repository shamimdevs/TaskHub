"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, ExternalLink, Link2, Users, Video } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import {
  useGetSocialAccountsQuery,
  useSetSocialProfileUrlMutation,
  useUnlinkSocialAccountMutation,
} from "@/redux/features/social/socialApi";
import type { Platform } from "@/types";

/** Providers the card lists. Only Facebook can be linked today. */
const PROVIDERS: {
  provider: Platform;
  label: string;
  icon: typeof Users;
  live: boolean;
}[] = [
  { provider: "facebook", label: "Facebook", icon: Users, live: true },
  { provider: "instagram", label: "Instagram", icon: Camera, live: false },
  { provider: "youtube", label: "YouTube", icon: Video, live: false },
];

/**
 * A worker's linked social accounts. Linking is what makes a proof mean
 * something: the profile link on every submission comes from the connected
 * account instead of being typed, and one social account can only ever belong
 * to one TaskHub worker.
 */
export function ConnectedAccounts() {
  const { data, isLoading } = useGetSocialAccountsQuery();
  const [setUrl, { isLoading: saving }] = useSetSocialProfileUrlMutation();
  const [unlink] = useUnlinkSocialAccountMutation();
  const toast = useToast();
  const status = useSearchParams().get("fb");

  const [draftUrl, setDraftUrl] = useState("");

  const accounts = data?.accounts ?? [];
  const linked = (p: Platform) => accounts.find((a) => a.provider === p);

  const saveUrl = async (id: string) => {
    try {
      await setUrl({ id, profileUrl: draftUrl.trim() }).unwrap();
      setDraftUrl("");
      toast.success("Profile link saved");
    } catch {
      toast.error("That does not look like a valid link");
    }
  };

  const drop = async (id: string) => {
    try {
      await unlink(id).unwrap();
      toast.success("Account unlinked");
    } catch {
      toast.error("Could not unlink");
    }
  };

  return (
    <Card>
      <CardHeader
        title="Connected accounts"
        description="Used to verify your task proofs"
      />
      <CardBody className="space-y-2">
        {status === "linked" && (
          <Alert tone="success">Facebook account linked.</Alert>
        )}
        {status === "taken" && (
          <Alert tone="danger">
            That Facebook account is already linked to another TaskHub worker.
          </Alert>
        )}
        {(status === "failed" || status === "invalid_state") && (
          <Alert tone="danger">Could not link Facebook. Please try again.</Alert>
        )}

        {PROVIDERS.map((p) => {
          const account = linked(p.provider);
          return (
            <div
              key={p.provider}
              className="rounded-lg border border-border p-2.5"
            >
              <div className="flex items-center gap-3">
                <p.icon size={18} className="text-fg-muted" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{p.label}</p>
                  <p className="truncate text-xs text-fg-muted">
                    {account
                      ? account.name
                      : p.live
                        ? "Not linked"
                        : "Coming soon"}
                  </p>
                </div>

                {account ? (
                  <Badge tone="success">Linked</Badge>
                ) : p.live && data?.available.facebook !== false ? (
                  <a
                    href="/api/integrations/facebook/connect?as=profile"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-card px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle"
                  >
                    <Link2 size={13} /> Link
                  </a>
                ) : (
                  <Badge tone="neutral">{p.live ? "Unavailable" : "Soon"}</Badge>
                )}
              </div>

              {account && (
                <div className="mt-2 space-y-2 border-t border-border pt-2">
                  {account.profileUrl ? (
                    <a
                      href={account.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 truncate text-xs font-medium text-brand hover:underline"
                    >
                      <ExternalLink size={12} className="shrink-0" />
                      {account.profileUrl}
                    </a>
                  ) : (
                    <Field
                      label="Your profile link"
                      hint="Facebook did not share it, so add it once — every proof will use it from now on."
                    >
                      <Input
                        placeholder="https://facebook.com/yourprofile"
                        value={draftUrl}
                        onChange={(e) => setDraftUrl(e.target.value)}
                      />
                      <Button
                        size="sm"
                        className="mt-2"
                        loading={saving}
                        disabled={!draftUrl.trim()}
                        onClick={() => saveUrl(account.id)}
                      >
                        Save link
                      </Button>
                    </Field>
                  )}
                  <button
                    onClick={() => drop(account.id)}
                    className="text-xs font-semibold text-danger hover:underline"
                  >
                    Unlink
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {!isLoading && data?.available.facebook === false && (
          <Alert tone="info">
            Account linking is not configured on this server yet.
          </Alert>
        )}
      </CardBody>
    </Card>
  );
}
