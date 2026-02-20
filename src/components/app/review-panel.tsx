"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { api } from "@/lib/convex-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { AuditStatusBadge } from "@/components/app/status-badges";

function renderAnswerValue(value: string | number | boolean | undefined) {
  if (value === undefined) {
    return "No answer";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return value.trim().length === 0 ? "No answer" : value;
}

export function ReviewPanel({ auditId }: { auditId: Id<"audits"> }) {
  const router = useRouter();
  const data = useQuery(api.audits.getAuditEditor, { auditId });
  const approveAudit = useMutation(api.audits.managerApprove);
  const rejectAudit = useMutation(api.audits.managerReject);
  const signOffAudit = useMutation(api.audits.managerSignOff);
  const [comment, setComment] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSigningOff, setIsSigningOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answersByQuestionId = useMemo(() => {
    if (!data) {
      return new Map<string, string | number | boolean>();
    }
    return new Map(data.answers.map((answer) => [answer.questionId, answer.value]));
  }, [data]);

  const onApprove = async () => {
    setError(null);
    setIsApproving(true);
    try {
      await approveAudit({ auditId });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve audit");
    } finally {
      setIsApproving(false);
    }
  };

  const onReject = async () => {
    const trimmed = comment.trim();
    if (trimmed.length === 0) {
      setError("A rejection comment is required");
      return;
    }
    setError(null);
    setIsRejecting(true);
    try {
      await rejectAudit({ auditId, comment: trimmed });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reject audit");
    } finally {
      setIsRejecting(false);
    }
  };

  const onSignOff = async () => {
    setError(null);
    setIsSigningOff(true);
    try {
      await signOffAudit({ auditId });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign off audit");
    } finally {
      setIsSigningOff(false);
    }
  };

  if (data === undefined) {
    return <p className="text-xs text-muted-foreground">Loading review...</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{data.template.title}</span>
            <AuditStatusBadge status={data.audit.status} />
          </CardTitle>
          <CardDescription>
            Auditor: {data.meta.auditorName}
            {data.meta.managerName ? ` · Manager: ${data.meta.managerName}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Started {new Date(data.audit.startedAt).toLocaleString()}
          </p>
          {data.audit.submittedAt ? (
            <p className="text-xs text-muted-foreground">
              Submitted {new Date(data.audit.submittedAt).toLocaleString()}
            </p>
          ) : null}
          {data.audit.managerComment ? (
            <p className="text-xs">
              Manager comment: <span className="text-muted-foreground">{data.audit.managerComment}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      {data.sections.map((section) => (
        <Card key={section._id}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {section.questions.map((question) => (
                <Field key={question._id}>
                  <FieldLabel>
                    {question.questionText}
                    {question.required ? <span className="text-destructive"> *</span> : null}
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    {renderAnswerValue(answersByQuestionId.get(question._id))}
                  </p>
                </Field>
              ))}
            </FieldGroup>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Review Actions</CardTitle>
          <CardDescription>
            Rejection requires a manager comment. Sign off permanently locks the audit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.permissions.canReject ? (
            <Field>
              <FieldLabel htmlFor="manager-comment">Rejection Comment</FieldLabel>
              <Textarea
                id="manager-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Explain why this audit is rejected"
              />
            </Field>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {data.permissions.canApprove ? (
              <Button onClick={onApprove} disabled={isApproving || isRejecting || isSigningOff}>
                {isApproving ? "Approving..." : "Approve"}
              </Button>
            ) : null}
            {data.permissions.canReject ? (
              <Button
                variant="destructive"
                onClick={onReject}
                disabled={isApproving || isRejecting || isSigningOff}
              >
                {isRejecting ? "Rejecting..." : "Reject"}
              </Button>
            ) : null}
            {data.permissions.canSignOff ? (
              <Button
                variant="outline"
                onClick={onSignOff}
                disabled={isApproving || isRejecting || isSigningOff}
              >
                {isSigningOff ? "Signing off..." : "Sign Off"}
              </Button>
            ) : null}
          </div>
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
