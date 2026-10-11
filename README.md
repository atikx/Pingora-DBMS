# Pingora 

Pingora is a full-stack community platform for sharing announcements, event notices and everyday discussion. Members publish rich-text posts, react to them with likes and threaded comments, follow the authors they care about, and schedule posts to go live at a later time. Administrator access is granted through a request-and-approval flow.

All data is stored in a **PostgreSQL** relational database and accessed from the backend with raw SQL (no ORM).

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Functionalities](#functionalities)
3. [Database Design](#database-design)
4. [Application Architecture](#application-architecture)
5. [Project Structure](#project-structure)

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React (Vite single-page app), Zustand (state management), Tailwind CSS, shadcn/ui, CASL (role-based permissions) |
| **Backend** | Node.js, Express.js (REST API) |
| **Database** | PostgreSQL (raw SQL through the `pg` connection pool), `uuid-ossp` extension |
| **Caching** | Redis (server side), client-side request caching |
| **Media** | Cloudinary (image storage and delivery) |
| **Containerisation** | Docker and Docker Compose (client, server, Redis, PostgreSQL) |

---

## Functionalities

### 1. Authentication and Account Management
- Account registration and login with email and password.
- Email verification: each account carries a one-time password (`otp`) and an `is_verified` flag, so only verified users are treated as active members.
- Editable profile with display name and avatar; a default avatar is assigned to new accounts.
- Account data is cleaned up automatically: deleting a user removes their posts, comments, likes, subscriptions and admin requests.

### 2. Role-Based Access Control
- Two kinds of account: **regular users** and **administrators** (`isadmin`).
- The frontend uses CASL to decide which screens and actions each role can see (for example, the admin dashboard is shown only to administrators).
- **Admin requests:** a regular user submits a request with a written reason. The request starts as `pending` and an administrator marks it `approved` or `rejected`. Approval promotes the user to administrator.

### 3. Posts
- Create, edit and delete posts, each with a title, short description, cover image, category and tags.
- Post content is rich text stored as structured JSON (`JSONB`), which keeps formatting intact and is easy to render.
- **Markdown support with live preview:** authors format text (headings, lists, code snippets) and see the rendered result in real time while writing.
- **Content sanitisation:** text entered in the editor is sanitised before it is saved, protecting readers from unsafe markup and filtering inappropriate content.
- **Image upload:** cover images are uploaded to Cloudinary; only the image URL is stored in the database, never the image itself.
- **View counter:** every post tracks how many times it has been viewed.
- **Categories and tags:** posts are organised by category and searchable tags.

### 4. Scheduled Publishing
- Authors can mark a post as scheduled and choose a publication date and time (`is_scheduled`, `scheduled_at`).
- Scheduled posts stay hidden from readers until their time arrives and are then published automatically, with no manual action from the author.

### 5. Likes
- Users like and unlike posts with a single click.
- A user can like a given post only once; this is enforced by a database constraint on `(user_id, post_id)`.
- Each user has a **Liked Posts** page listing everything they have liked.
- Like counts are computed from the stored likes, so they are always consistent.

### 6. Comments and Nested Discussions
- Users comment on any post.
- **Threaded replies:** a comment can be a reply to another comment, to any depth. This is stored with a self-referencing `parent_id`, so entire discussion trees are loaded and displayed in order.
- Deleting a comment automatically removes all of its replies.

### 7. Author Subscriptions
- Users subscribe to authors they like to follow.
- A user can subscribe to an author only once (unique `(user_id, author_id)` pair).
- Subscribers are notified when a subscribed author publishes a new post.

### 8. Feed, Browsing and Pagination
- Posts are shown dynamically on the home feed, with filtering by category and tags.
- Results are paginated, so the application loads only what is needed instead of the whole post list.

### 9. Performance and Reliability
- **Server-side caching:** frequently requested data is cached to reduce database load and response time.
- **Client-side request caching:** expensive API responses are cached in the browser to avoid repeated network calls.
- **Loading states:** React Suspense boundaries with loading placeholders keep the interface responsive while data is fetched, and errors are handled gracefully with clear user feedback.

### 10. Security and Abuse Prevention
- **Rate limiting** restricts how often a user can perform actions such as posting or commenting, which protects the platform from spam and scams.
- Input validation on the backend, content sanitisation and role checks protect the API.
- All database access goes through parameterised raw SQL queries.


---

## Database Design

The relational schema has six tables:

| Table | Purpose |
|---|---|
| `users` | Accounts: name, unique email, password, avatar, admin flag, verification status and OTP |
| `posts` | Published and scheduled posts: title, description, JSONB content, image, tags, category, views, schedule |
| `likes` | Which user liked which post (many-to-many; unique per user and post) |
| `comments` | Comments on posts, with `parent_id` for nested replies |
| `subscriptions` | Which user follows which author (many-to-many on `users`; unique per pair) |
| `admin_requests` | Requests for admin access, with reason and `status` (`pending`, `approved`, `rejected`) |

**Relationships**

- One user publishes many posts.
- Users like many posts, and posts are liked by many users.
- A post has many comments, a user writes many comments, and a comment has many replies (recursive).
- A user subscribes to many authors, and an author has many subscribers (recursive).
- One user submits many admin requests.

**Integrity rules:** UUID primary keys, foreign keys with `ON DELETE CASCADE`, unique constraints on email, likes and subscriptions, `NOT NULL` on mandatory fields, and an enumerated type for request status.

---

## Application Architecture

```
Browser ──► client (React + Vite) ──► server (Express REST API) ──┬──► PostgreSQL (raw SQL)
                                                                  ├──► Redis (cache)
                                                                  └──► Cloudinary (images)
```

- The **client** renders the interface, manages state with Zustand and calls the REST API.
- The **server** validates requests, applies authentication, roles and rate limits, runs raw SQL against PostgreSQL, and uses Redis for caching.
- **PostgreSQL** is the single source of truth for users, posts and all interactions.

---

