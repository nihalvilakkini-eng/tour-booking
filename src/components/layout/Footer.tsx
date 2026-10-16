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
          background: #142923;
          color: white;
          padding: 42px 0;
        }

        .footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 28px;
        }

        .footer-brand {
          font-size: 25px;
          font-weight: 800;
        }

        .footer-brand span {
          color: #61d8b7;
        }

        p {
          max-width: 300px;
          color: #b8c9c2;
          font-size: 14px;
          line-height: 1.7;
        }

        .footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          font-size: 14px;
        }

        .footer-links a:hover {
          color: #61d8b7;
        }

        .copyright {
          width: 100%;
          padding-top: 22px;
          border-top: 1px solid #345047;
          color: #b8c9c2;
          font-size: 13px;
        }
      `}</style>
    </footer>
  );
}
