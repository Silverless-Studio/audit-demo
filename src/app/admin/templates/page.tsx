"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AppShell } from "@/components/app/app-shell";
import { RoleGuard } from "@/components/app/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminTemplatesPage() {
  const templates = useQuery(api.templates.listAdminTemplates);
  const createTemplateDraft = useMutation(api.templates.createTemplateDraft);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const createTemplate = async () => {
    setCreating(true);
    try {
      await createTemplateDraft({
        title: title.trim(),
        description: description.trim(),
      });
      setTitle("");
      setDescription("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell title="Templates" subtitle="Create, version, and publish engagement templates.">
      <RoleGuard allowed={["admin"]}>
        <Card>
          <CardHeader>
            <CardTitle>Create draft template</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="template-title">Title</Label>
              <Input
                id="template-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Safety walkthrough"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Input
                id="template-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Engagement scope and instructions"
              />
            </div>
            <Button
              onClick={createTemplate}
              disabled={creating || !title.trim() || !description.trim()}
            >
              {creating ? "Creating..." : "Create draft"}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-4 grid gap-3">
          {(templates ?? []).map((template) => (
            <Card key={template._id}>
              <CardHeader>
                <CardTitle className="text-base">{template.title}</CardTitle>
                <CardDescription>
                  Version {template.version} • Created {new Date(template.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant={template.status === "published" ? "default" : "secondary"} className="capitalize">
                  {template.status}
                </Badge>
                <Button asChild variant="outline">
                  <Link href={`/admin/templates/${template._id}`}>Edit</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </RoleGuard>
    </AppShell>
  );
}

