
# PINGORA

Welcome to Pingora — the simplest way to stay informed, share updates, and spark conversations within your community. Whether it's important announcements, event notices, or casual discussions, Pingora keeps everyone in the loop — fast, clear, and effortlessly. Built for connection, designed for clarity — Pingora is where your community thrives.


## Installation

After clonning Open Terminal and run following command

```bash
  cd ./client
  npm i
  npm run dev
```

Open new Terminal and run the following commands

```bash
  cd ./server
  npm i
  npm run dev
```

Note: You Can also run the app with docker but you still have to install postgres in your system because I have used db outside of docker

## Prerequisites (For using without Docker)

Make sure you have the following installed:
- Git (for clonning)
- Node.js (v16 or higher)
- npm 
- PostGres

  
## Prerequisites (For using with Docker)

Make sure you have the following installed:
- Git (for clonning)
- Docker Engine
- PostGres

## 📁 Project Structure
```
pingora/
├── client/ # Frontend application
├── server/ # Backend application
└── README.md # This file
```

## Tech Stack Used

**Client:** React, Zustand, TailwindCSS, Shadcn, Casl

**Server:** Node, Express, Cloudinary

**Db:** PostgreSQL 



## Features Implimented

- Image upload
- Paginatio (werever required)
- Content Sanitization in Editor
- Markdown Support with realtime Preview of the Post
- Option to Subscribe the author and get notified about new posts.
- Option to like the posts and see all the liked posts.
- Rate Limiting to prevent scams
-  Request caching in the frontend for expensive api requests 
- Option to Schedule Post to get uploaded automaticaly on a particular time
- Caching mechanism in server
- Proper error handling with React Suspense Boundaries
- Nested comments section



## Screenshots

1. Home page
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748851477/Screenshot_2025-06-02_133232_mjahry.png)

2. Profile page
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748851574/Screenshot_2025-06-02_133605_uzuoea.png)

3. Final Post Upload Page
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748851805/Screenshot_2025-06-02_133957_yn9ufb.png)

4. Your Posts page
5. 
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748851860/Screenshot_2025-06-02_134047_umual1.png)

6. Post page

![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748851976/Screenshot_2025-06-02_134243_ho2uvr.png)

6. Nested comments Section
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748852321/Screenshot_2025-06-02_134829_ueltla.png)

7. Subscriptions page
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748852404/Screenshot_2025-06-02_134954_u0pqys.png)

8. Admin Requests page
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748852470/Screenshot_2025-06-02_135101_iibvfs.png)

9. New Post page
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748852553/Screenshot_2025-06-02_135221_uamf9t.png)



## My thoughts on Completion

I have completed the project till STAGE-4 (which was the final stage) with implimenting each and every task mentioned in each stage.

I have tried my best to follow all the mentioned good practises but I sill messed up with maintaining proper git comments and code uploads. I was supposed to use conventional commits but I didnt used them till half of the project. 

But I think I have done the best I can considering the time (because I was also having CRUX inductions along with this induction)




