"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { api } from "@/lib/convex-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuditStatusBadge } from "@/components/app/status-badges";

type AnswerValue = string | number | boolean;

export function AuditEditor({ auditId }: { auditId: Id<"audits"> }) {
  const router = useRouter();
  const data = useQuery(api.audits.getAuditEditor, { auditId });
  const saveAnswer = useMutation(api.audits.saveAnswer);
  const submitAudit = useMutation(api.audits.submitAudit);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [saveStates, setSaveStates] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!data) {
      return;
    }
    const nextAnswers: Record<string, AnswerValue> = {};
    for (const answer of data.answers) {
      nextAnswers[answer.questionId] = answer.value;
    }
    setAnswers(nextAnswers);
  }, [data]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of Object.values(timers)) {
        clearTimeout(timer);
      }
    };
  }, []);

  const pendingSaveCount = useMemo(() => Object.keys(saveStates).length, [saveStates]);

  const queueSave = (questionId: string, value: AnswerValue) => {
    if (!data?.permissions.canEdit) {
      return;
    }
    setAnswers((current) => ({ ...current, [questionId]: value }));
    if (timersRef.current[questionId]) {
      clearTimeout(timersRef.current[questionId]);
    }
    timersRef.current[questionId] = setTimeout(async () => {
      setSaveStates((current) => ({ ...current, [questionId]: true }));
      try {
        await saveAnswer({
          auditId,
          questionId: questionId as Id<"auditQuestions">,
          value,
        });
      } finally {
        setSaveStates((current) => {
          const next = { ...current };
          delete next[questionId];
          return next;
        });
      }
    }, 400);
  };

  const onSubmitAudit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitAudit({ auditId });
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to submit audit");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (data === undefined) {
    return <div className="text-xs text-muted-foreground">Loading audit...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span>{data.template.title}</span>
            <AuditStatusBadge status={data.audit.status} />
          </CardTitle>
          <CardDescription>
            Version {data.audit.templateVersion} · Auditor: {data.meta.auditorName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Completion</span>
              <span>
                {data.progress.requiredAnswered}/{data.progress.requiredTotal} required
              </span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${data.progress.completionPercent}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {pendingSaveCount > 0
              ? "Autosaving..."
              : data.permissions.canEdit
                ? "Autosave enabled"
                : "Audit is read-only"}
          </p>
        </CardContent>
      </Card>

      {data.sections.map((section) => (
        <Card key={section._id}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {section.questions.map((question) => {
                const raw = answers[question._id];
                const isSaving = Boolean(saveStates[question._id]);
                const baseLabel = (
                  <>
                    {question.questionText}
                    {question.required ? <span className="text-destructive"> *</span> : null}
                  </>
                );

                if (question.type === "text") {
                  return (
                    <Field key={question._id}>
                      <FieldLabel>{baseLabel}</FieldLabel>
                      <Textarea
                        value={typeof raw === "string" ? raw : ""}
                        onChange={(event) => queueSave(question._id, event.target.value)}
                        disabled={!data.permissions.canEdit}
                      />
                      {isSaving ? (
                        <p className="text-xs text-muted-foreground">Saving...</p>
                      ) : null}
                    </Field>
                  );
                }

                if (question.type === "number") {
                  return (
                    <Field key={question._id}>
                      <FieldLabel>{baseLabel}</FieldLabel>
                      <Input
                        type="number"
                        value={typeof raw === "number" ? String(raw) : ""}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (!Number.isNaN(next)) {
                            queueSave(question._id, next);
                          }
                        }}
                        disabled={!data.permissions.canEdit}
                      />
                      {isSaving ? (
                        <p className="text-xs text-muted-foreground">Saving...</p>
                      ) : null}
                    </Field>
                  );
                }

                if (question.type === "boolean") {
                  const booleanValue =
                    typeof raw === "boolean" ? (raw ? "true" : "false") : null;
                  return (
                    <Field key={question._id}>
                      <FieldLabel>{baseLabel}</FieldLabel>
                      <Select
                        items={[
                          { label: "Yes", value: "true" },
                          { label: "No", value: "false" },
                        ]}
                        value={booleanValue}
                        onValueChange={(value) => {
                          if (value !== null) {
                            queueSave(question._id, value === "true");
                          }
                        }}
                        disabled={!data.permissions.canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select one" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {isSaving ? (
                        <p className="text-xs text-muted-foreground">Saving...</p>
                      ) : null}
                    </Field>
                  );
                }

                const selectValue = typeof raw === "string" ? raw : null;
                return (
                  <Field key={question._id}>
                    <FieldLabel>{baseLabel}</FieldLabel>
                    <Select
                      items={(question.options ?? []).map((option) => ({
                        label: option,
                        value: option,
                      }))}
                      value={selectValue}
                      onValueChange={(value) => {
                        if (value !== null) {
                          queueSave(question._id, value);
                        }
                      }}
                      disabled={!data.permissions.canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select one" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {(question.options ?? []).map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {isSaving ? (
                      <p className="text-xs text-muted-foreground">Saving...</p>
                    ) : null}
                  </Field>
                );
              })}
            </FieldGroup>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-4">
          <Button
            onClick={onSubmitAudit}
            disabled={
              !data.permissions.canSubmit ||
              isSubmitting ||
              pendingSaveCount > 0 ||
              data.progress.requiredUnanswered > 0
            }
          >
            {isSubmitting ? "Submitting..." : "Submit Audit"}
          </Button>
          {data.progress.requiredUnanswered > 0 ? (
            <p className="text-xs text-muted-foreground">
              Required unanswered: {data.progress.requiredUnanswered}
            </p>
          ) : null}
          {submitError ? <p className="text-destructive text-xs">{submitError}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
