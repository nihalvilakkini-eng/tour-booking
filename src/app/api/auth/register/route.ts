import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import connectDB from "@/lib/mongodb";
import cloudinary from "@/lib/cloudinary";
import { getJwtSecret } from "@/lib/auth";
import User from "@/models/User";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const VALID_BUSINESS_TYPES = [
  "Travel Agency",
  "Tour Operator",
  "Adventure Activity Provider",
  "Local Tour Guide",
  "Trekking Organizer",
  "Resort / Hotel",
  "Other",
] as const;

type RegistrationData = {
  accountType?: unknown;
  role?: unknown;
  name?: unknown;
  lastName?: unknown;
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
  phone?: unknown;

  // Operator application fields
  businessName?: unknown;
  businessType?: unknown;
  businessDescription?: unknown;
  businessEmail?: unknown;
  country?: unknown;
  state?: unknown;
  city?: unknown;
  businessAddress?: unknown;
  yearsOfExperience?: unknown;
  website?: unknown;
  registrationNumber?: unknown;
  operatorPhone?: unknown;
  operatorApplication?: Record<string, unknown>;
};

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
    let data: RegistrationData = {};
    let profileImage: FormDataEntryValue | null = null;
    const contentType = request.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();

    if (contentType === "multipart/form-data") {
      const formData = await request.formData();
      data = {
        accountType: formData.get("accountType"),
        role: formData.get("role"),
        name: formData.get("name"),
        lastName: formData.get("lastName"),
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword"),
        phone: formData.get("phone"),

        businessName: formData.get("businessName"),
        businessType: formData.get("businessType"),
        businessDescription: formData.get("businessDescription"),
        businessEmail: formData.get("businessEmail"),
        country: formData.get("country"),
        state: formData.get("state"),
        city: formData.get("city"),
        businessAddress: formData.get("businessAddress"),
        yearsOfExperience: formData.get("yearsOfExperience"),
        website: formData.get("website"),
        registrationNumber: formData.get("registrationNumber"),
        operatorPhone: formData.get("operatorPhone"),
      };
      profileImage = formData.get("profileImage");
    } else if (contentType === "application/x-www-form-urlencoded") {
      const formData = await request.formData();
      data = {
        accountType: formData.get("accountType"),
        role: formData.get("role"),
        name: formData.get("name"),
        lastName: formData.get("lastName"),
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword"),
        phone: formData.get("phone"),

        businessName: formData.get("businessName"),
        businessType: formData.get("businessType"),
        businessDescription: formData.get("businessDescription"),
        businessEmail: formData.get("businessEmail"),
        country: formData.get("country"),
        state: formData.get("state"),
        city: formData.get("city"),
        businessAddress: formData.get("businessAddress"),
        yearsOfExperience: formData.get("yearsOfExperience"),
        website: formData.get("website"),
        registrationNumber: formData.get("registrationNumber"),
        operatorPhone: formData.get("operatorPhone"),
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

    const requestedRole = String(
      data.accountType || data.role || "user"
    ).trim().toLowerCase();
    const isOperator = requestedRole === "operator";

    // Common fields extraction
    const rawFullName = String(data.fullName ?? "").trim();
    let name = String(data.name ?? "").trim();
    let lastName = String(data.lastName ?? "").trim();

    if (rawFullName) {
      const spaceIdx = rawFullName.indexOf(" ");
      if (spaceIdx !== -1) {
        if (!name) name = rawFullName.substring(0, spaceIdx).trim();
        if (!lastName) lastName = rawFullName.substring(spaceIdx + 1).trim();
      } else {
        if (!name) name = rawFullName;
      }
    }

    const email = String(data.email ?? "").trim().toLowerCase();
    const password = typeof data.password === "string" ? data.password : "";
    const confirmPassword =
      typeof data.confirmPassword === "string"
        ? data.confirmPassword
        : undefined;

    let phone = String(data.phone || data.operatorPhone || "").trim();

    // Validations: Full Name, Email, Password, Confirm Password
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Full Name is required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, message: "Password is required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && confirmPassword !== password) {
      return NextResponse.json(
        { success: false, message: "Passwords do not match" },
        { status: 400 }
      );
    }

    // Phone number is mandatory for BOTH Traveller and Operator
    if (!phone) {
      return NextResponse.json(
        { success: false, message: "Phone number is required" },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: "Phone number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    // Operator specific validation
    let operatorAppPayload: {
      businessName: string;
      businessType: string;
      businessDescription: string;
      phone: string;
      businessEmail: string;
      country: string;
      state: string;
      city: string;
      businessAddress: string;
      yearsOfExperience: number;
      website: string;
      registrationNumber: string;
      status: "pending";
      rejectionReason: string;
      submittedAt: Date;
    } | undefined = undefined;

    if (isOperator) {
      const nestedApp =
        data.operatorApplication && typeof data.operatorApplication === "object"
          ? data.operatorApplication
          : {};

      const businessName = String(
        data.businessName || nestedApp.businessName || ""
      ).trim();
      const businessType = String(
        data.businessType || nestedApp.businessType || ""
      ).trim();
      const businessDescription = String(
        data.businessDescription || nestedApp.businessDescription || ""
      ).trim();
      const opPhone = String(
        data.operatorPhone ||
          data.phone ||
          nestedApp.phone ||
          nestedApp.operatorPhone ||
          ""
      ).trim();
      const businessEmail = String(
        data.businessEmail || nestedApp.businessEmail || ""
      ).trim().toLowerCase();
      const country = String(
        data.country || nestedApp.country || ""
      ).trim();
      const state = String(
        data.state || nestedApp.state || ""
      ).trim();
      const city = String(
        data.city || nestedApp.city || ""
      ).trim();
      const businessAddress = String(
        data.businessAddress || nestedApp.businessAddress || ""
      ).trim();
      const yearsVal =
        data.yearsOfExperience !== undefined
          ? data.yearsOfExperience
          : nestedApp.yearsOfExperience;
      const yearsOfExperience = Number(yearsVal);
      const website = String(
        data.website || nestedApp.website || ""
      ).trim();
      const registrationNumber = String(
        data.registrationNumber || nestedApp.registrationNumber || ""
      ).trim();

      if (!businessName) {
        return NextResponse.json(
          { success: false, message: "Business / Company Name is required" },
          { status: 400 }
        );
      }

      if (
        !businessType ||
        !VALID_BUSINESS_TYPES.includes(
          businessType as (typeof VALID_BUSINESS_TYPES)[number]
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Please select a valid Business Type (${VALID_BUSINESS_TYPES.join(
              ", "
            )})`,
          },
          { status: 400 }
        );
      }

      if (!businessDescription) {
        return NextResponse.json(
          { success: false, message: "Business Description is required" },
          { status: 400 }
        );
      }

      if (!opPhone) {
        return NextResponse.json(
          { success: false, message: "Contact Phone Number is required" },
          { status: 400 }
        );
      }

      if (!/^\d{10}$/.test(opPhone)) {
        return NextResponse.json(
          {
            success: false,
            message: "Phone number must be exactly 10 digits",
          },
          { status: 400 }
        );
      }

      // Update common phone to operator phone
      phone = opPhone;

      if (!businessEmail) {
        return NextResponse.json(
          { success: false, message: "Business Email is required" },
          { status: 400 }
        );
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
        return NextResponse.json(
          { success: false, message: "Please provide a valid Business Email" },
          { status: 400 }
        );
      }

      if (!country || !state || !city || !businessAddress) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Country, state, city and business address are all required",
          },
          { status: 400 }
        );
      }

      if (
        yearsVal === undefined ||
        yearsVal === null ||
        yearsVal === "" ||
        Number.isNaN(yearsOfExperience) ||
        yearsOfExperience < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Years of Experience must be a non-negative number",
          },
          { status: 400 }
        );
      }

      operatorAppPayload = {
        businessName,
        businessType,
        businessDescription,
        phone: opPhone,
        businessEmail,
        country,
        state,
        city,
        businessAddress,
        yearsOfExperience,
        website,
        registrationNumber,
        status: "pending",
        rejectionReason: "",
        submittedAt: new Date(),
      };
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

    // IMPORTANT: When Operator registers, initially keep role as "user".
    // Set operatorApplication.status to "pending".
    // Do not grant operator dashboard or operator API permissions yet.
    // For Traveller, operatorApplication is left undefined.
    const userRole = "user";

    const user = await User.create({
      name,
      lastName,
      email,
      password: await bcrypt.hash(password, 10),
      phone,
      role: userRole,
      profileImage: profileImageUrl,
      ...(operatorAppPayload
        ? { operatorApplication: operatorAppPayload }
        : {}),
    });

    // Create notification if Operator application was submitted
    if (isOperator && operatorAppPayload) {
      try {
        await createNotification({
          user: user._id,
          type: "operator_application_submitted",
          title: "Operator Application Submitted",
          message:
            "Your application to become a verified operator on WAYORA has been submitted and is currently pending review by an administrator.",
        });
      } catch (notifErr) {
        console.error("Failed to send operator application notification:", notifErr);
      }
    }

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
        message: isOperator
          ? "Operator application submitted successfully and is pending review"
          : "Registration successful",
        data: {
          id: user._id,
          name: user.name,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          profileImage: user.profileImage,
          role: user.role,
          operatorApplication: user.operatorApplication,
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
