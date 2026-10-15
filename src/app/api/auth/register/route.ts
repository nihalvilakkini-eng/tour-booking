import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import connectDB from "@/lib/mongodb";
import cloudinary from "@/lib/cloudinary";
import User from "@/models/User";

type RegistrationData = {
  name?: unknown;
  lastName?: unknown;
  email?: unknown;
  password?: unknown;
  phone?: unknown;
  role?: unknown;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Please define JWT_SECRET in .env.local");
  }
  return secret;
}

async function uploadProfileImage(image: File): Promise<string> {
  const buffer = Buffer.from(await image.arrayBuffer());

  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "tour-booking/profile-images",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary upload failed"));
          return;
        }

        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}

export async function POST(request: NextRequest) {
  try {
    let data: RegistrationData;
    let profileImage: FormDataEntryValue | null = null;
    const contentType = request.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();

    if (contentType === "multipart/form-data") {
      const formData = await request.formData();
      data = {
        name: formData.get("name"),
        lastName: formData.get("lastName"),
        email: formData.get("email"),
        password: formData.get("password"),
        phone: formData.get("phone"),
        role: formData.get("role"),
      };
      profileImage = formData.get("profileImage");
    } else if (contentType === "application/x-www-form-urlencoded") {
      const formData = await request.formData();
      data = {
        name: formData.get("name"),
        lastName: formData.get("lastName"),
        email: formData.get("email"),
        password: formData.get("password"),
        phone: formData.get("phone"),
        role: formData.get("role"),
      };
    } else if (contentType === "application/json") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid JSON body. In Postman, select Body > raw > JSON and send the registration fields as JSON.",
          },
          { status: 400 }
        );
      }

      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return NextResponse.json(
          { success: false, message: "Request body must be a JSON object" },
          { status: 400 }
        );
      }
      data = body as RegistrationData;
    } else {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unsupported request body. Use JSON, x-www-form-urlencoded, or form-data in Postman.",
        },
        { status: 415 }
      );
    }

    const name = String(data.name ?? "").trim();
    const lastName = String(data.lastName ?? "").trim();
    const email = String(data.email ?? "").trim().toLowerCase();
    const password = typeof data.password === "string" ? data.password : "";
    const phone = String(data.phone ?? "").trim();
    const role =
      data.role === undefined || data.role === null || data.role === ""
        ? "user"
        : String(data.role);

    if (!name || !lastName || !email || !password || !phone) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, last name, email, password, and phone are required",
        },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: "Phone number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (role !== "user" && role !== "operator") {
      return NextResponse.json(
        { success: false, message: "Role must be user or operator" },
        { status: 400 }
      );
    }

    if (
      profileImage instanceof File &&
      profileImage.size > 0 &&
      !profileImage.type.startsWith("image/")
    ) {
      return NextResponse.json(
        { success: false, message: "Profile image must be an image" },
        { status: 400 }
      );
    }

    if (profileImage instanceof File && profileImage.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "Profile image must be less than 5MB" },
        { status: 400 }
      );
    }

    const jwtSecret = getJwtSecret();
    await connectDB();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const profileImageUrl =
      profileImage instanceof File && profileImage.size > 0
        ? await uploadProfileImage(profileImage)
        : "";

    const user = await User.create({
      name,
      lastName,
      email,
      password: await bcrypt.hash(password, 10),
      phone,
      role,
      profileImage: profileImageUrl,
    });

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        email: user.email,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        data: {
          id: user._id,
          name: user.name,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          profileImage: user.profileImage,
          role: user.role,
        },
      },
      { status: 201 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { success: false, message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, message: "Registration failed" },
      { status: 500 }
    );
  }
}
