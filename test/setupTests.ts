import "@testing-library/jest-dom"
import { vi } from "vitest"

import i18n from "@/i18n"

// Fix the language to Japanese for all tests so Japanese-string assertions pass
i18n.changeLanguage("ja")

globalThis.DMP_EDITOR_BASE = "/"

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ isLoading: false, error: null, data: true }),
}))

const mockUser = {
  grdmId: "12345",
  fullName: "Test User",
  givenName: "Test",
  familyName: "User",
  orcid: null,
  researcherId: null,
  affiliation: "Test Institution",
  timezone: "Asia/Tokyo",
  email: null,
  grdmProfileUrl: "https://example.com/profile",
  profileImage: "https://example.com/profile.jpg",
}

vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ isLoading: false, error: null, data: mockUser }),
}))

const mockProjectInfo = {
  id: "project-123",
  type: "project",
  title: "Test Project",
  description: "This is a test project",
  createdAt: "2023-01-01T00:00:00Z",
  updatedAt: "2023-01-02T00:00:00Z",
  html: "https://example.com/project-123",
  self: "https://example.com/self/project-123",
}

vi.mock("@/hooks/useProjects", () => ({
  useProjects: () => ({ isLoading: false, error: null, data: [mockProjectInfo] }),
}))

vi.mock("@/hooks/useProjectInfo", () => ({
  useProjectInfo: () => ({ isLoading: false, error: null, data: mockProjectInfo }),
}))

vi.mock("@/hooks/useDmp", () => ({
  useDmp: () => ({ isLoading: false, error: null, data: null }),
}))
