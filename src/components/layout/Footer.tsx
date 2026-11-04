"use client";
import Link from "next/link";

export default function Footer() {
const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <Link href="/" className="footer-brand">
            WAYORA<span>.</span>
          </Link>
          <p>
            Discover the world, one unforgettable experience at a time.
          </p>
        </div>

        <div className="footer-links">
          <Link href="/tours">Explore Tours</Link>
          <Link href="/bookings">My Bookings</Link>
          <Link href="/login">Login</Link>
          <Link href="/register">Register</Link>
        </div>

        <div className="copyright">
          © {year} WAYORA. All rights reserved.
        </div>
      </div>

      <style jsx>{`
        .footer {
          background: #132a24;
          color: white;
          padding: 50px 0 34px;
        }

        .footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 28px;
        }

        .footer-brand {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: 0;
        }

        .footer-brand span {
          color: #61d8b7;
        }

        p {
          max-width: 300px;
          margin: 10px 0 0;
          color: #b8c9c2;
          font-size: 14px;
          line-height: 1.7;
        }

        .footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 22px;
          font-size: 13px;
          font-weight: 600;
        }

        .footer-links a:hover {
          color: #9ee2c9;
        }

        .copyright {
          width: 100%;
          padding-top: 22px;
          border-top: 1px solid rgba(255, 255, 255, 0.14);
          color: #b8c9c2;
          font-size: 13px;
        }

        @media (max-width: 640px) {
          .footer {
            padding: 38px 0 26px;
          }

          .footer-inner {
            align-items: flex-start;
            flex-direction: column;
            gap: 22px;
          }

          .footer-links {
            gap: 14px 20px;
          }
        }
      `}</style>
    </footer>
  );
}
