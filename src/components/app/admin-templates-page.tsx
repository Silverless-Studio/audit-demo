"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { api } from "@/lib/convex-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TemplateStatusBadge } from "@/components/app/status-badges";

export function AdminTemplatesPage() {
  const router = useRouter();
  const templates = useQuery(api.templates.listForAdmin, {});
  const createTemplate = useMutation(api.templates.createTemplate);
  const createTemplateVersion = useMutation(api.templates.createTemplateVersion);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [creatingVersionFor, setCreatingVersionFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groupedTemplates = useMemo(() => {
    if (!templates) {
      return [];
    }
    const groups = new Map<string, typeof templates>();
    for (const template of templates) {
      const bucket = groups.get(template.templateFamilyId) ?? [];
      bucket.push(template);
      groups.set(template.templateFamilyId, bucket);
    }
    return [...groups.entries()].map(([familyId, versions]) => ({
      familyId,
      versions: versions.sort((a, b) => b.version - a.version),
    }));
  }, [templates]);

  const onCreateTemplate = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setError(null);
    setIsCreating(true);
    try {
      const templateId = await createTemplate({
        title: title.trim(),
        description: description.trim(),
      });
      router.push(`/admin/templates/${templateId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create template");
    } finally {
      setIsCreating(false);
    }
  };

  const onCreateVersion = async (templateId: string) => {
    setCreatingVersionFor(templateId);
    setError(null);
    try {
      const newVersionId = await createTemplateVersion({
        templateId: templateId as Id<"auditTemplates">,
      });
      router.push(`/admin/templates/${newVersionId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create version");
    } finally {
      setCreatingVersionFor(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Template Management</h1>
        <p className="text-muted-foreground text-xs">
          Create templates, version drafts, and publish to auditors.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Template</CardTitle>
          <CardDescription>Starts at version 1 in draft mode.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="template-title">Title</FieldLabel>
              <Input
                id="template-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Warehouse Safety Audit"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="template-description">Description</FieldLabel>
              <Textarea
                id="template-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what this template covers"
              />
            </Field>
            <Button onClick={onCreateTemplate} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Draft Template"}
            </Button>
            {error ? <p className="text-destructive text-xs">{error}</p> : null}
          </FieldGroup>
        </CardContent>
      </Card>

      {templates === undefined ? (
        <p className="text-xs text-muted-foreground">Loading templates...</p>
      ) : groupedTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-xs text-muted-foreground">
            No templates yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupedTemplates.map((group) => (
            <Card key={group.familyId}>
              <CardHeader>
                <CardTitle>{group.versions[0].title}</CardTitle>
                <CardDescription>Family {group.familyId}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.versions.map((template) => (
                  <div
                    key={template._id}
                    className="flex items-center justify-between rounded border p-2"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Version {template.version}</p>
                      <TemplateStatusBadge status={template.status} />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        nativeButton={false}
                        variant="outline"
                        render={<Link href={`/admin/templates/${template._id}`} />}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        disabled={Boolean(creatingVersionFor)}
                        onClick={() => onCreateVersion(template._id)}
                      >
                        {creatingVersionFor === template._id
                          ? "Creating..."
                          : "New Version"}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
