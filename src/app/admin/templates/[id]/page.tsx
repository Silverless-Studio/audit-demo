"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { AppShell } from "@/components/app/app-shell";
import { RoleGuard } from "@/components/app/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type QuestionDraft = {
  questionText: string;
  type: "text" | "number" | "boolean" | "select";
  required: boolean;
  options: string;
};

type SectionDraft = {
  title: string;
  questions: QuestionDraft[];
};

export default function TemplateBuilderPage() {
  const params = useParams<{ id: string }>();
  const templateId = params.id as Id<"auditTemplates">;
  const router = useRouter();

  const data = useQuery(api.templates.getTemplateEditor, {
    templateId,
  });

  const updateTemplateDraft = useMutation(api.templates.updateTemplateDraft);
  const publishTemplate = useMutation(api.templates.publishTemplate);
  const createVersion = useMutation(api.templates.createTemplateVersionFromExisting);
  const deleteTemplateDraft = useMutation(api.templates.deleteTemplateDraft);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<SectionDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }

    setTitle(data.template.title);
    setDescription(data.template.description);
    setSections(
      data.sections.map((section) => ({
        title: section.title,
        questions: section.questions.map((question) => ({
          questionText: question.questionText,
          type: question.type,
          required: question.required,
          options: (question.options ?? []).join(", "),
        })),
      })),
    );
  }, [data]);

  const persistDraft = async () => {
    if (!data) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await updateTemplateDraft({
        templateId: data.template._id,
        title: title.trim(),
        description: description.trim(),
        sections: sections.map((section) => ({
          title: section.title.trim(),
          questions: section.questions.map((question) => ({
            questionText: question.questionText.trim(),
            type: question.type,
            required: question.required,
            options:
              question.type === "select"
                ? question.options
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean)
                : undefined,
          })),
        })),
      });
      setMessage("Draft saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!data) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await publishTemplate({ templateId: data.template._id });
      setMessage("Template published");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setSaving(false);
    }
  };

  const forkVersion = async () => {
    if (!data) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const newTemplateId = await createVersion({
        sourceTemplateId: data.template._id,
      });
      router.push(`/admin/templates/${newTemplateId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Version creation failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async () => {
    if (!data || data.template.status !== "draft") {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await deleteTemplateDraft({ templateId: data.template._id });
      router.push("/admin/templates");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Template Builder" subtitle="Dynamic sections and question ordering.">
      <RoleGuard allowed={["admin"]}>
        {!data ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">Loading template...</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{data.template.title}</CardTitle>
                <CardDescription>
                  Version {data.template.version}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant={data.template.status === "published" ? "default" : "secondary"} className="capitalize">
                  {data.template.status}
                </Badge>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} disabled={data.template.status !== "draft"} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} disabled={data.template.status !== "draft"} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={persistDraft} disabled={saving || data.template.status !== "draft"}>
                    {saving ? "Working..." : "Save draft"}
                  </Button>
                  <Button onClick={publish} variant="secondary" disabled={saving || data.template.status !== "draft"}>
                    Publish template
                  </Button>
                  <Button onClick={forkVersion} variant="outline" disabled={saving}>
                    Create new version
                  </Button>
                  <Button onClick={deleteDraft} variant="destructive" disabled={saving || data.template.status !== "draft"}>
                    Delete draft
                  </Button>
                </div>
                {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
              </CardContent>
            </Card>

            {sections.map((section, sectionIndex) => (
              <Card key={`section-${sectionIndex}`}>
                <CardHeader>
                  <CardTitle className="text-base">Section {sectionIndex + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Section title</Label>
                    <Input
                      value={section.title}
                      disabled={data.template.status !== "draft"}
                      onChange={(event) => {
                        const next = [...sections];
                        next[sectionIndex] = {
                          ...next[sectionIndex],
                          title: event.target.value,
                        };
                        setSections(next);
                      }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={data.template.status !== "draft" || sectionIndex === 0}
                      onClick={() => {
                        const next = [...sections];
                        const previous = next[sectionIndex - 1];
                        next[sectionIndex - 1] = next[sectionIndex];
                        next[sectionIndex] = previous;
                        setSections(next);
                      }}
                    >
                      Move up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        data.template.status !== "draft" ||
                        sectionIndex === sections.length - 1
                      }
                      onClick={() => {
                        const next = [...sections];
                        const following = next[sectionIndex + 1];
                        next[sectionIndex + 1] = next[sectionIndex];
                        next[sectionIndex] = following;
                        setSections(next);
                      }}
                    >
                      Move down
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={data.template.status !== "draft"}
                      onClick={() => {
                        const next = sections.filter((_, index) => index !== sectionIndex);
                        setSections(next);
                      }}
                    >
                      Remove section
                    </Button>
                  </div>

                  <div className="space-y-4 rounded border p-3">
                    {section.questions.map((question, questionIndex) => (
                      <div key={`question-${sectionIndex}-${questionIndex}`} className="space-y-2 rounded border p-3">
                        <Label>Question text</Label>
                        <Input
                          value={question.questionText}
                          disabled={data.template.status !== "draft"}
                          onChange={(event) => {
                            const next = [...sections];
                            next[sectionIndex].questions[questionIndex] = {
                              ...next[sectionIndex].questions[questionIndex],
                              questionText: event.target.value,
                            };
                            setSections(next);
                          }}
                        />

                        <Label>Type</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          value={question.type}
                          disabled={data.template.status !== "draft"}
                          onChange={(event) => {
                            const nextType = event.target.value as QuestionDraft["type"];
                            const next = [...sections];
                            next[sectionIndex].questions[questionIndex] = {
                              ...next[sectionIndex].questions[questionIndex],
                              type: nextType,
                              options: nextType === "select" ? question.options : "",
                            };
                            setSections(next);
                          }}
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="select">Select</option>
                        </select>

                        {question.type === "select" ? (
                          <>
                            <Label>Options (comma separated)</Label>
                            <Input
                              value={question.options}
                              disabled={data.template.status !== "draft"}
                              onChange={(event) => {
                                const next = [...sections];
                                next[sectionIndex].questions[questionIndex] = {
                                  ...next[sectionIndex].questions[questionIndex],
                                  options: event.target.value,
                                };
                                setSections(next);
                              }}
                            />
                          </>
                        ) : null}

                        <div className="flex items-center gap-2">
                          <input
                            id={`required-${sectionIndex}-${questionIndex}`}
                            type="checkbox"
                            checked={question.required}
                            disabled={data.template.status !== "draft"}
                            onChange={(event) => {
                              const next = [...sections];
                              next[sectionIndex].questions[questionIndex] = {
                                ...next[sectionIndex].questions[questionIndex],
                                required: event.target.checked,
                              };
                              setSections(next);
                            }}
                          />
                          <Label htmlFor={`required-${sectionIndex}-${questionIndex}`}>
                            Required
                          </Label>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={data.template.status !== "draft" || questionIndex === 0}
                            onClick={() => {
                              const next = [...sections];
                              const previous = next[sectionIndex].questions[questionIndex - 1];
                              next[sectionIndex].questions[questionIndex - 1] =
                                next[sectionIndex].questions[questionIndex];
                              next[sectionIndex].questions[questionIndex] = previous;
                              setSections(next);
                            }}
                          >
                            Question up
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={
                              data.template.status !== "draft" ||
                              questionIndex === section.questions.length - 1
                            }
                            onClick={() => {
                              const next = [...sections];
                              const following = next[sectionIndex].questions[questionIndex + 1];
                              next[sectionIndex].questions[questionIndex + 1] =
                                next[sectionIndex].questions[questionIndex];
                              next[sectionIndex].questions[questionIndex] = following;
                              setSections(next);
                            }}
                          >
                            Question down
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={data.template.status !== "draft"}
                            onClick={() => {
                              const next = [...sections];
                              next[sectionIndex].questions = next[sectionIndex].questions.filter(
                                (_, index) => index !== questionIndex,
                              );
                              setSections(next);
                            }}
                          >
                            Remove question
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      disabled={data.template.status !== "draft"}
                      onClick={() => {
                        const next = [...sections];
                        next[sectionIndex].questions.push({
                          questionText: "",
                          type: "text",
                          required: false,
                          options: "",
                        });
                        setSections(next);
                      }}
                    >
                      Add question
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              type="button"
              disabled={data.template.status !== "draft"}
              onClick={() => {
                setSections((prev) => [
                  ...prev,
                  {
                    title: "",
                    questions: [],
                  },
                ]);
              }}
            >
              Add section
            </Button>
          </div>
        )}
      </RoleGuard>
    </AppShell>
  );
}

