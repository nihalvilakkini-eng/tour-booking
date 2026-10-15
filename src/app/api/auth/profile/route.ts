import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import cloudinary from "@/lib/cloudinary";
export const dynamic = "force-dynamic";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Please define JWT_SECRET in .env.local");
  }

  return secret;
}

function getUserIdFromToken(token: string): string {
  const decoded = jwt.verify(token, getJwtSecret());

  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  return decoded.userId;
}

// ==============================
// GET AUTHENTICATED PROFILE
// ==============================
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(token);

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
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
      { status: 200 }
    );
  } catch (error) {
    console.error("Profile error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Invalid or expired token",
      },
      { status: 401 }
    );
  }
}

// ==============================
// UPDATE PROFILE
// ==============================
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    // Check token
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    // Get user ID from JWT
    const userId = getUserIdFromToken(token);

    // Get form data
    const formData = await request.formData();

    const name = formData.get("name")?.toString().trim();
    const lastName = formData.get("lastName")?.toString().trim();
    const phone = formData.get("phone")?.toString().trim();

    const profileImage = formData.get("profileImage");

    // ==============================
    // VALIDATION
    // ==============================

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Name is required",
        },
        { status: 400 }
      );
    }

    if (!lastName) {
      return NextResponse.json(
        {
          success: false,
          message: "Last name is required",
        },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number is required",
        },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number must be exactly 10 digits",
        },
        { status: 400 }
      );
    }

    // ==============================
    // FIND USER
    // ==============================

    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // ==============================
    // PROFILE IMAGE UPLOAD
    // ==============================

    let profileImageUrl = existingUser.profileImage || "";

    if (profileImage instanceof File && profileImage.size > 0) {
      // Check image type
      if (!profileImage.type.startsWith("image/")) {
        return NextResponse.json(
          {
            success: false,
            message: "Profile image must be an image",
          },
          { status: 400 }
        );
      }

      // Maximum 5 MB
      if (profileImage.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          {
            success: false,
            message: "Profile image must be less than 5MB",
          },
          { status: 400 }
        );
      }

      // Convert image to Buffer
      const bytes = await profileImage.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to Cloudinary
      const uploadResult = await new Promise<{
        secure_url: string;
      }>((resolve, reject) => {
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

            resolve({
              secure_url: result.secure_url,
            });
          }
        );

        uploadStream.end(buffer);
      });

      profileImageUrl = uploadResult.secure_url;
    }

    // ==============================
    // UPDATE USER
    // ==============================

    existingUser.name = name;
    existingUser.lastName = lastName;
    existingUser.phone = phone;
    existingUser.profileImage = profileImageUrl;

    await existingUser.save();

    // ==============================
    // RESPONSE
    // ==============================

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully",
        data: {
          id: existingUser._id,
          name: existingUser.name,
          lastName: existingUser.lastName,
          email: existingUser.email,
          phone: existingUser.phone,
          profileImage: existingUser.profileImage,
          role: existingUser.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Profile update error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Profile update failed",
      },
      { status: 500 }
    );
  }
}