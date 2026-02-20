"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/convex-api";

export function NewAuditPage() {
  const router = useRouter();
  const templates = useQuery(api.templates.listLatestPublished, {});
  const startAudit = useMutation(api.audits.startAudit);
  const [startingTemplateId, setStartingTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onStartAudit = async (templateId: string) => {
    setStartingTemplateId(templateId);
    setError(null);
    try {
      const auditId = await startAudit({
        templateId: templateId as Id<"auditTemplates">,
      });
      router.push(`/audits/${auditId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start audit");
    } finally {
      setStartingTemplateId(null);
    }
  };

  if (templates === undefined) {
    return <div className="text-sm text-muted-foreground">Loading templates...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Start a New Audit</h1>
        <p className="text-muted-foreground text-xs">
          Choose from the latest published template versions.
        </p>
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-xs text-muted-foreground">
              No published templates are available yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template._id}>
              <CardHeader>
                <CardTitle>{template.title}</CardTitle>
                <CardDescription>
                  Version {template.version}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{template.description}</p>
                <Button
                  disabled={Boolean(startingTemplateId)}
                  onClick={() => onStartAudit(template._id)}
                >
                  {startingTemplateId === template._id ? "Starting..." : "Start Audit"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
