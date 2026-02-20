"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { AppShell } from "@/components/app/app-shell";
import { RoleGuard } from "@/components/app/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type LocalAnswerValue = string | boolean;

export default function AuditDetailPage() {
  const params = useParams<{ id: string }>();
  const auditId = params.id as Id<"audits">;
  const details = useQuery(api.audits.getAuditDetails, {
    auditId,
  });

  const saveAnswer = useMutation(api.audits.saveAnswer);
  const clearAnswer = useMutation(api.audits.clearAnswer);
  const submitAudit = useMutation(api.audits.submitAudit);

  const [answers, setAnswers] = useState<Record<string, LocalAnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!details) {
      return;
    }

    const nextAnswers: Record<string, LocalAnswerValue> = {};
    for (const section of details.sections) {
      for (const question of section.questions) {
        if (!question.answer) {
          continue;
        }

        if (question.type === "boolean") {
          nextAnswers[question._id] = Boolean(question.answer.value);
          continue;
        }

        nextAnswers[question._id] = String(question.answer.value);
      }
    }

    setAnswers(nextAnswers);
  }, [details]);

  const completionPercent = useMemo(() => {
    if (!details || details.completion.totalQuestions === 0) {
      return 0;
    }

    return Math.round(
      (details.completion.answeredQuestions / details.completion.totalQuestions) * 100,
    );
  }, [details]);

  const scheduleSave = (
    questionId: string,
    questionType: "text" | "number" | "boolean" | "select",
    value: LocalAnswerValue,
  ) => {
    setMessage("Saving...");
    if (timersRef.current[questionId]) {
      clearTimeout(timersRef.current[questionId]);
    }

    timersRef.current[questionId] = setTimeout(async () => {
      try {
        if (questionType === "boolean") {
          await saveAnswer({
            auditId,
            questionId: questionId as Id<"auditQuestions">,
            value: Boolean(value),
          });
          setMessage("Saved");
          return;
        }

        const rawValue = String(value);
        if (rawValue.trim().length === 0) {
          await clearAnswer({
            auditId,
            questionId: questionId as Id<"auditQuestions">,
          });
          setMessage("Saved");
          return;
        }

        if (questionType === "number") {
          const parsed = Number(rawValue);
          if (Number.isNaN(parsed)) {
            setMessage("Number answer is invalid");
            return;
          }

          await saveAnswer({
            auditId,
            questionId: questionId as Id<"auditQuestions">,
            value: parsed,
          });
          setMessage("Saved");
          return;
        }

        await saveAnswer({
          auditId,
          questionId: questionId as Id<"auditQuestions">,
          value: rawValue,
        });
        setMessage("Saved");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to save");
      }
    }, 500);
  };

  const submit = async () => {
    if (!details) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await submitAudit({ auditId: details.audit._id });
      setMessage("Audit submitted");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Audit" subtitle="Answer by section with autosave enabled.">
      <RoleGuard allowed={["auditor", "manager", "admin"]}>
        {!details ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">Loading audit...</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{details.template.title}</CardTitle>
                <CardDescription>{details.template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="capitalize">
                    {details.audit.status.replace("_", " ")}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {completionPercent}% complete ({details.completion.answeredQuestions}/{details.completion.totalQuestions})
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-muted">
                  <div
                    className="h-2 bg-primary transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                {details.audit.managerComment ? (
                  <p className="text-sm text-destructive">Manager comment: {details.audit.managerComment}</p>
                ) : null}
                {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
              </CardContent>
            </Card>

            {details.sections.map((section) => (
              <Card key={section._id}>
                <CardHeader>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.questions.map((question) => {
                    const answerValue = answers[question._id];
                    const disabled = !details.permissions.canEditAnswers;

                    if (question.type === "boolean") {
                      return (
                        <div key={question._id} className="space-y-2">
                          <Label>
                            {question.questionText} {question.required ? "*" : ""}
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={answerValue === true ? "default" : "outline"}
                              disabled={disabled}
                              onClick={() => {
                                setAnswers((prev) => ({ ...prev, [question._id]: true }));
                                scheduleSave(question._id, question.type, true);
                              }}
                            >
                              Yes
                            </Button>
                            <Button
                              type="button"
                              variant={answerValue === false ? "default" : "outline"}
                              disabled={disabled}
                              onClick={() => {
                                setAnswers((prev) => ({ ...prev, [question._id]: false }));
                                scheduleSave(question._id, question.type, false);
                              }}
                            >
                              No
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    if (question.type === "text") {
                      return (
                        <div key={question._id} className="space-y-2">
                          <Label htmlFor={question._id}>
                            {question.questionText} {question.required ? "*" : ""}
                          </Label>
                          <Textarea
                            id={question._id}
                            value={typeof answerValue === "string" ? answerValue : ""}
                            disabled={disabled}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setAnswers((prev) => ({ ...prev, [question._id]: nextValue }));
                              scheduleSave(question._id, question.type, nextValue);
                            }}
                          />
                        </div>
                      );
                    }

                    if (question.type === "number") {
                      return (
                        <div key={question._id} className="space-y-2">
                          <Label htmlFor={question._id}>
                            {question.questionText} {question.required ? "*" : ""}
                          </Label>
                          <Input
                            id={question._id}
                            type="number"
                            disabled={disabled}
                            value={typeof answerValue === "string" ? answerValue : ""}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setAnswers((prev) => ({ ...prev, [question._id]: nextValue }));
                              scheduleSave(question._id, question.type, nextValue);
                            }}
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={question._id} className="space-y-2">
                        <Label htmlFor={question._id}>
                          {question.questionText} {question.required ? "*" : ""}
                        </Label>
                        <select
                          id={question._id}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          disabled={disabled}
                          value={typeof answerValue === "string" ? answerValue : ""}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setAnswers((prev) => ({ ...prev, [question._id]: nextValue }));
                            scheduleSave(question._id, question.type, nextValue);
                          }}
                        >
                          <option value="">Select option</option>
                          {(question.options ?? []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}

            {details.permissions.canEditAnswers ? (
              <Button
                onClick={submit}
                disabled={!details.permissions.canSubmit || submitting}
              >
                {submitting ? "Submitting..." : "Submit audit"}
              </Button>
            ) : null}
          </div>
        )}
      </RoleGuard>
    </AppShell>
  );
}

