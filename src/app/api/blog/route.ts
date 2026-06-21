import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug     = searchParams.get("slug");
    const limit    = Number(searchParams.get("limit")) || 10;
    const adminAll = searchParams.get("admin") === "true";

    const session = await auth();
    const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

    if (slug) {
      const post = await prisma.blogPost.findUnique({
        where: { slug },
        include: { comments: { where: { isApproved: true } } },
      });
      if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(post);
    }

    const posts = await prisma.blogPost.findMany({
      where: (adminAll && isAdmin) ? {} : { isPublished: true },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        id: true, title: true, slug: true, excerpt: true,
        image: true, publishedAt: true, isPublished: true,
        tags: true, authorId: true,
      },
    });

    return NextResponse.json(posts);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const body = await req.json();
    const post = await prisma.blogPost.create({
      data: { ...body, authorId: session?.user?.id },
    });
    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
