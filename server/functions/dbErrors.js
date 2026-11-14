// Translates PostgreSQL integrity errors into friendly HTTP responses.
//
// The DATABASE enforces the rule (UNIQUE / CHECK / NOT NULL / FK / trigger);
// this file only turns the error it raised into a readable message, so the UI
// never shows a bare "500 Internal server error" for a rule violation.
//
// SQLSTATE codes used:
//   23505 unique_violation     23514 check_violation     23502 not_null_violation
//   23503 foreign_key_violation 23001 restrict_violation (our last-admin trigger)
//   22P02 invalid_text_representation (bad UUID / enum value)

const CONSTRAINT_MESSAGES = {
  likes_user_id_post_id_key: "You have already liked this post.",
  subscriptions_user_id_author_id_key: "You are already subscribed to this author.",
  users_email_key: "An account with this email already exists.",
  chk_subscriptions_no_self: "You cannot subscribe to yourself.",
  chk_posts_schedule_has_time: "A scheduled post must have a publish time.",
  chk_posts_title_not_blank: "The title cannot be blank.",
  chk_posts_views_non_negative: "Views cannot be negative.",
  chk_comments_content_not_blank: "A comment cannot be empty.",
  chk_comments_not_own_parent: "A comment cannot be its own parent.",
  chk_admin_requests_reason_not_blank: "Please give a reason for your request.",
  chk_users_otp_6_digits: "The OTP must be a 6-digit number.",
  chk_users_email_format: "That email address is not valid.",
};

// Returns { status, message, code, constraint } for a known integrity error,
// or null when the error is not a rule violation (caller falls back to 500).
export function describePgError(err) {
  if (!err || !err.code) return null;
  const known = CONSTRAINT_MESSAGES[err.constraint];

  switch (err.code) {
    case "23505":
      return { status: 409, message: known || "That record already exists." };
    case "23514":
      return { status: 400, message: known || "That value is not allowed." };
    case "23502":
      return { status: 400, message: `A required value is missing (${err.column || "unknown column"}).` };
    case "23503":
      return { status: 404, message: "The related record does not exist." };
    case "23001":
      return { status: 409, message: err.message };
    case "22P02":
      return { status: 400, message: "Invalid value or identifier." };
    default:
      return null;
  }
}

// Sends the friendly error and returns true when handled; returns false otherwise.
export function sendDbError(res, err) {
  const info = describePgError(err);
  if (!info) return false;
  res.status(info.status).json({
    message: info.message,
    rule: err.constraint || err.code,
    enforcedBy: "database",
  });
  return true;
}
