![image](https://github.com/user-attachments/assets/3dc9b191-cb79-422d-af56-406ec7355eb3)

# Expressjs.Yourself

A simple blog platform built with **Express.js**, **EJS**, and **SQLite** that allows users to register, login, create posts, edit and delete their own posts, and view a featured random post on the main page.

Note: This project is primarily backend-focused; the frontend was kept minimal and did not receive significant time or attention.
---

## Tech Stack

- **Express.js**: Web framework for Node.js to handle routing and server logic.
- **EJS**: Embedded JavaScript templates for rendering dynamic HTML pages.
- **SQLite (via better-sqlite3)**: Lightweight SQL database used for persisting users and posts.
- **bcrypt**: Password hashing for secure authentication.
- **jsonwebtoken (JWT)**: Token-based user authentication and session management.
- **sanitize-html**: Sanitizes user input to prevent XSS attacks.
- **cookie-parser**: Middleware to parse cookies from HTTP requests.
- **Tailwind CSS**: Utility-first CSS framework for styling UI components.

---

## Features

- **User Authentication**  
  Secure registration and login system with hashed passwords and JWT-based session tokens.

- **Create, Edit, and Delete Posts**  
  Logged-in users can create new posts, edit their existing posts, and delete posts they authored.

- **Random Featured Post on Main Page**  
  Both the homepage (for guests) and the user dashboard (for logged-in users) display a random post from any user as a featured post.

- **User Dashboard**  
  Logged-in users can view all their posts in a personal dashboard along with the featured random post.

- **Input Validation and Sanitization**  
  Posts and user inputs are validated and cleaned to prevent malicious input.


