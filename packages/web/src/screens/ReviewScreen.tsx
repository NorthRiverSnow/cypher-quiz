import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";

import { useConnection } from "../controller/useConnection";
import { useProgress } from "../controller/useProgress";
import { useReview } from "../controller/useReview";
import { useRun } from "../controller/useRun";
import { ReviewPage } from "../view/pages/ReviewPage/ReviewPage";
import type { ScreenProps } from "./screen";

export const ReviewScreen = ({ notices, band }: ScreenProps) => {
  const navigate = useNavigate();
  const { cardId = "", direction = "" } = useParams();
  const review = useReview(cardId, direction, useProgress(notices));
  const { status } = useConnection(notices);
  const run = useRun(notices, status?.connected === true);
  const [draft, setDraft] = useState<string>();

  /* why: URL は手で書ける。開けないものは結果へ送り返す */
  if (review === undefined) {
    return <Navigate to="/result" replace />;
  }

  return (
    <ReviewPage
      notices={band}
      section={review.section}
      direction={review.direction}
      prompt={review.prompt}
      onBack={() => void navigate("/result")}
      back={{
        chosen: review.chosen,
        correct: review.correct,
        ...(review.code === undefined ? {} : { code: review.code }),
        ...(review.expected === undefined ? {} : { expected: review.expected }),
        ...(review.note === undefined ? {} : { note: review.note }),
        ...(review.warn === undefined ? {} : { warn: review.warn }),
        ...(review.editable && review.cypher !== undefined
          ? {
              editor: {
                ...(draft === undefined ? {} : { value: draft }),
                onChange: setDraft,
                onEdit: () => setDraft(review.cypher ?? ""),
                onRun: () => void run.run(draft ?? review.cypher ?? ""),
                onReset: () => setDraft(undefined),
                status: run.status,
                listing: review.listing,
                ...(run.errorMessage === undefined ? {} : { errorMessage: run.errorMessage }),
              },
            }
          : {}),
        ...(run.result === undefined ? {} : { result: run.result }),
      }}
    />
  );
};
