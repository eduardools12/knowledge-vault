import { SubmitButton } from "@/components/forms/submit-button";
import { submitReviewAction } from "@/features/reviews/actions";
import { REVIEW_RATINGS, type ReviewRating } from "@/features/reviews/schedule";

/**
 * Four buttons, four separate forms — not one form with four submit buttons
 * sharing a name/value pair, so each can show its own pending state via
 * `SubmitButton`'s `useFormStatus` without extra wiring.
 *
 * A Server Component: nothing here needs a client hook of its own, only
 * `SubmitButton` does, and a Server Component can render a Client Component
 * fine.
 */
const VARIANT_BY_RATING: Record<ReviewRating, "destructive" | "outline" | "secondary" | "default"> = {
  forgot: "destructive",
  hard: "outline",
  good: "secondary",
  easy: "default",
};

export function ReviewRatingForm({ knowledgeId }: { knowledgeId: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {Object.values(REVIEW_RATINGS).map((rating) => (
        <form key={rating.value} action={submitReviewAction}>
          <input type="hidden" name="knowledgeId" value={knowledgeId} />
          <input type="hidden" name="rating" value={rating.value} />

          <SubmitButton variant={VARIANT_BY_RATING[rating.value as ReviewRating]} className="w-full">
            {rating.label}
          </SubmitButton>
        </form>
      ))}
    </div>
  );
}
