"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { AppShell } from "@/components/app/app-shell";
import { RoleGuard } from "@/components/app/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const renderAnswer = (value: string | number | boolean | undefined) => {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (value === undefined) {
    return "Unanswered";
  }
  return String(value);
};

export default function ReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const auditId = params.id as Id<"audits">;
  const router = useRouter();

  const details = useQuery(api.audits.getAuditDetails, {
    auditId,
  });

  const reviewAudit = useMutation(api.audits.reviewAudit);
  const signOffAudit = useMutation(api.audits.signOffAudit);

  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: "approve" | "reject") => {
    if (!details) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await reviewAudit({
        auditId: details.audit._id,
        decision,
        comment,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save decision");
    } finally {
      setLoading(false);
    }
  };

  const signOff = async () => {
    if (!details) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signOffAudit({
        auditId: details.audit._id,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign off");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Audit Review" subtitle="Read-only answers with manager decisions.">
      <RoleGuard allowed={["manager", "admin"]}>
        {!details ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">Loading review...</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{details.template.title}</CardTitle>
                <CardDescription>{details.template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="secondary" className="capitalize">
                  {details.audit.status.replace("_", " ")}
                </Badge>
                {details.audit.managerComment ? (
                  <p className="text-sm text-muted-foreground">
                    Existing comment: {details.audit.managerComment}
                  </p>
                ) : null}
                {details.permissions.canReview ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="comment">Manager comment (required for rejection)</Label>
                      <Textarea
                        id="comment"
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => decide("approve")} disabled={loading}>
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => decide("reject")}
                        disabled={loading}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : null}
                {details.permissions.canSignOff ? (
                  <Button variant="default" onClick={signOff} disabled={loading}>
                    Sign off and lock
                  </Button>
                ) : null}
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </CardContent>
            </Card>

            {details.sections.map((section) => (
              <Card key={section._id}>
                <CardHeader>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.questions.map((question) => (
                    <div key={question._id} className="space-y-1">
                      <p className="text-sm font-medium">
                        {question.questionText} {question.required ? "*" : ""}
                      </p>
                      <p className="rounded border bg-muted/30 px-3 py-2 text-sm">
                        {renderAnswer(question.answer?.value)}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </RoleGuard>
    </AppShell>
  );
}

