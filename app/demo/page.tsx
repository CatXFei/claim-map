"use client"
import { redirect } from "next/navigation"

export default function DemoPage() {
  // Redirect to the home page with demo mode
  redirect("/?demo=true")
}
