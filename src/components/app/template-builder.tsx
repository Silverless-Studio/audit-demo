"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { api } from "@/lib/convex-api";
import { QuestionType } from "@/lib/domain";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateStatusBadge } from "@/components/app/status-badges";

type BuilderQuestion = {
  localId: string;
  questionText: string;
  type: QuestionType;
  options: string[];
  required: boolean;
};

type BuilderSection = {
  localId: string;
  title: string;
  questions: BuilderQuestion[];
};

const createQuestion = (): BuilderQuestion => ({
  localId: crypto.randomUUID(),
  questionText: "",
  type: "text",
  options: [],
  required: true,
});

const createSection = (): BuilderSection => ({
  localId: crypto.randomUUID(),
  title: "",
  questions: [createQuestion()],
});

const QUESTION_TYPE_ITEMS = [
  { label: "Text", value: "text" },
  { label: "Number", value: "number" },
  { label: "Yes / No", value: "boolean" },
  { label: "Select", value: "select" },
] as const;

export function TemplateBuilder({ templateId }: { templateId: Id<"auditTemplates"> }) {
  const router = useRouter();
  const data = useQuery(api.templates.getTemplateBuilder, { templateId });
  const updateMeta = useMutation(api.templates.updateTemplateMeta);
  const saveStructure = useMutation(api.templates.saveTemplateStructure);
  const publishTemplate = useMutation(api.templates.publishTemplate);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<BuilderSection[]>([]);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [isSavingStructure, setIsSavingStructure] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }
    setTitle(data.template.title);
    setDescription(data.template.description);
    setSections(
      data.sections.map((section) => ({
        localId: section._id,
        title: section.title,
        questions: section.questions.map((question) => ({
          localId: question._id,
          questionText: question.questionText,
          type: question.type,
          options: question.options ?? [],
          required: question.required,
        })),
      }))
    );
  }, [data]);

  const isDraft = data?.template.status === "draft";
  const sectionCount = sections.length;
  const questionCount = useMemo(
    () => sections.reduce((count, section) => count + section.questions.length, 0),
    [sections]
  );

  const setSection = (index: number, updater: (section: BuilderSection) => BuilderSection) => {
    setSections((current) =>
      current.map((section, sectionIndex) =>
        sectionIndex === index ? updater(section) : section
      )
    );
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    setSections((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const moveQuestion = (sectionIndex: number, questionIndex: number, direction: -1 | 1) => {
    setSection(sectionIndex, (section) => {
      const targetIndex = questionIndex + direction;
      if (targetIndex < 0 || targetIndex >= section.questions.length) {
        return section;
      }
      const nextQuestions = [...section.questions];
      [nextQuestions[questionIndex], nextQuestions[targetIndex]] = [
        nextQuestions[targetIndex],
        nextQuestions[questionIndex],
      ];
      return { ...section, questions: nextQuestions };
    });
  };

  const onSaveMeta = async () => {
    if (!data) {
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setIsSavingMeta(true);
    try {
      await updateMeta({
        templateId,
        title: title.trim(),
        description: description.trim(),
      });
      setSuccessMessage("Template details saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save template details");
    } finally {
      setIsSavingMeta(false);
    }
  };

  const onSaveStructure = async () => {
    if (!data) {
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setIsSavingStructure(true);
    try {
      await saveStructure({
        templateId,
        sections: sections.map((section, sectionIndex) => ({
          title: section.title.trim(),
          order: sectionIndex,
          questions: section.questions.map((question, questionIndex) => ({
            questionText: question.questionText.trim(),
            type: question.type,
            options: question.type === "select" ? question.options : undefined,
            required: question.required,
            order: questionIndex,
          })),
        })),
      });
      setSuccessMessage("Template structure saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save template structure");
    } finally {
      setIsSavingStructure(false);
    }
  };

  const onPublish = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsPublishing(true);
    try {
      await publishTemplate({ templateId });
      setSuccessMessage("Template published.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish template");
    } finally {
      setIsPublishing(false);
    }
  };

  if (data === undefined) {
    return <p className="text-xs text-muted-foreground">Loading template...</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span>{data.template.title}</span>
            <TemplateStatusBadge status={data.template.status} />
          </CardTitle>
          <CardDescription>
            Version {data.template.version} · {sectionCount} sections · {questionCount} questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="template-title">Title</FieldLabel>
              <Input
                id="template-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={!isDraft}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="template-description">Description</FieldLabel>
              <Textarea
                id="template-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={!isDraft}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onSaveMeta} disabled={!isDraft || isSavingMeta}>
                {isSavingMeta ? "Saving..." : "Save Details"}
              </Button>
              <Button
                variant="outline"
                onClick={onPublish}
                disabled={!isDraft || isPublishing || isSavingStructure}
              >
                {isPublishing ? "Publishing..." : "Publish Template"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sections & Questions</CardTitle>
          <CardDescription>Build dynamic sections and reorder questions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSections((current) => [...current, createSection()])}
              disabled={!isDraft}
            >
              Add Section
            </Button>
            <Button onClick={onSaveStructure} disabled={!isDraft || isSavingStructure}>
              {isSavingStructure ? "Saving..." : "Save Structure"}
            </Button>
          </div>

          {sections.map((section, sectionIndex) => (
            <Card key={section.localId} size="sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>Section {sectionIndex + 1}</span>
                  <div className="flex gap-1">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => moveSection(sectionIndex, -1)}
                      disabled={!isDraft || sectionIndex === 0}
                    >
                      Up
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => moveSection(sectionIndex, 1)}
                      disabled={!isDraft || sectionIndex === sections.length - 1}
                    >
                      Down
                    </Button>
                    <Button
                      size="xs"
                      variant="destructive"
                      onClick={() =>
                        setSections((current) =>
                          current.filter((_, index) => index !== sectionIndex)
                        )
                      }
                      disabled={!isDraft}
                    >
                      Remove
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field>
                  <FieldLabel>Section Title</FieldLabel>
                  <Input
                    value={section.title}
                    onChange={(event) =>
                      setSection(sectionIndex, (current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    disabled={!isDraft}
                  />
                </Field>

                {section.questions.map((question, questionIndex) => (
                  <Card key={question.localId} size="sm">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-2">
                        <span className="text-xs">Question {questionIndex + 1}</span>
                        <div className="flex gap-1">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => moveQuestion(sectionIndex, questionIndex, -1)}
                            disabled={!isDraft || questionIndex === 0}
                          >
                            Up
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => moveQuestion(sectionIndex, questionIndex, 1)}
                            disabled={
                              !isDraft || questionIndex === section.questions.length - 1
                            }
                          >
                            Down
                          </Button>
                          <Button
                            size="xs"
                            variant="destructive"
                            onClick={() =>
                              setSection(sectionIndex, (current) => ({
                                ...current,
                                questions: current.questions.filter(
                                  (_, index) => index !== questionIndex
                                ),
                              }))
                            }
                            disabled={!isDraft}
                          >
                            Remove
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Field>
                        <FieldLabel>Question Text</FieldLabel>
                        <Input
                          value={question.questionText}
                          onChange={(event) =>
                            setSection(sectionIndex, (current) => ({
                              ...current,
                              questions: current.questions.map((currentQuestion, index) =>
                                index === questionIndex
                                  ? {
                                      ...currentQuestion,
                                      questionText: event.target.value,
                                    }
                                  : currentQuestion
                              ),
                            }))
                          }
                          disabled={!isDraft}
                        />
                      </Field>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Field>
                          <FieldLabel>Type</FieldLabel>
                          <Select
                            items={QUESTION_TYPE_ITEMS}
                            value={question.type}
                            onValueChange={(value) =>
                              setSection(sectionIndex, (current) => ({
                                ...current,
                                questions: current.questions.map((currentQuestion, index) =>
                                  index === questionIndex
                                    ? {
                                        ...currentQuestion,
                                        type: value as QuestionType,
                                        options:
                                          value === "select" ? currentQuestion.options : [],
                                      }
                                    : currentQuestion
                                ),
                              }))
                            }
                            disabled={!isDraft}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {QUESTION_TYPE_ITEMS.map((item) => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field>
                          <FieldLabel>Required</FieldLabel>
                          <Select
                            items={[
                              { label: "Yes", value: "true" },
                              { label: "No", value: "false" },
                            ]}
                            value={question.required ? "true" : "false"}
                            onValueChange={(value) =>
                              setSection(sectionIndex, (current) => ({
                                ...current,
                                questions: current.questions.map((currentQuestion, index) =>
                                  index === questionIndex
                                    ? {
                                        ...currentQuestion,
                                        required: value === "true",
                                      }
                                    : currentQuestion
                                ),
                              }))
                            }
                            disabled={!isDraft}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="true">Yes</SelectItem>
                                <SelectItem value="false">No</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                      {question.type === "select" ? (
                        <Field>
                          <FieldLabel>Options (comma separated)</FieldLabel>
                          <Input
                            value={question.options.join(", ")}
                            onChange={(event) =>
                              setSection(sectionIndex, (current) => ({
                                ...current,
                                questions: current.questions.map((currentQuestion, index) =>
                                  index === questionIndex
                                    ? {
                                        ...currentQuestion,
                                        options: event.target.value
                                          .split(",")
                                          .map((item) => item.trim())
                                          .filter((item) => item.length > 0),
                                      }
                                    : currentQuestion
                                ),
                              }))
                            }
                            disabled={!isDraft}
                          />
                        </Field>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  onClick={() =>
                    setSection(sectionIndex, (current) => ({
                      ...current,
                      questions: [...current.questions, createQuestion()],
                    }))
                  }
                  disabled={!isDraft}
                >
                  Add Question
                </Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      {successMessage ? (
        <p className="text-xs text-muted-foreground">{successMessage}</p>
      ) : null}
    </div>
  );
}
