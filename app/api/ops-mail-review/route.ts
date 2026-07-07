import {
  assertOpsMailReviewAuthorized,
  getOpsMailPersistenceNote,
  getOpsMailReviewPath,
  getOpsMailReviewState,
  isOpsMailReviewUnauthorizedError,
  isOpsMailReviewWriteDisabledError,
  upsertOpsMailReviewEntry,
  type OpsMailReviewStatus,
} from "../../lib/ops-mail-review-store.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OpsMailReviewRequestBody = {
  findingId?: string;
  status?: OpsMailReviewStatus;
  note?: string;
};

export function GET() {
  return Response.json({
    ...getOpsMailReviewState(),
    path: getOpsMailReviewPath(),
    persistenceNote: getOpsMailPersistenceNote(),
  });
}

export async function POST(request: Request) {
  try {
    assertOpsMailReviewAuthorized(request);
    const body = (await request.json()) as OpsMailReviewRequestBody;
    return Response.json({
      ...upsertOpsMailReviewEntry({
        findingId: body.findingId ?? "",
        status: body.status ?? "open",
        ...(body.note !== undefined ? { note: body.note } : {}),
      }),
      path: getOpsMailReviewPath(),
      persistenceNote: getOpsMailPersistenceNote(),
    });
  } catch (error) {
    return Response.json(
      { error: errorMessage(error), persistenceNote: getOpsMailPersistenceNote() },
      {
        status: isOpsMailReviewUnauthorizedError(error)
          ? 401
          : isOpsMailReviewWriteDisabledError(error)
            ? 403
            : 400,
      },
    );
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Ops mail review request failed.";
}
