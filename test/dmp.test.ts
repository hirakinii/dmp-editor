import { describe, it, expect } from "vitest"

import { initDmp, initPersonInfo, personInfoSchema, personInfoSourceSchema } from "../src/dmp"
import type { User } from "../src/hooks/useUser"

const baseUser: User = {
  grdmId: "user123",
  fullName: "Taro Yamada",
  givenName: "Taro",
  familyName: "Yamada",
  givenNameJa: null,
  familyNameJa: null,
  orcid: null,
  researcherId: null,
  affiliation: "東京大学",
  timezone: "Asia/Tokyo",
  email: "taro@example.com",
  grdmProfileUrl: "https://example.com/profile",
  profileImage: "https://example.com/profile.jpg",
}

describe("initDmp", () => {
  it("uses English name when Japanese names are not available", () => {
    const dmp = initDmp(baseUser)

    expect(dmp.personInfo).toHaveLength(1)
    expect(dmp.personInfo[0].lastName).toBe("Yamada")
    expect(dmp.personInfo[0].firstName).toBe("Taro")
  })

  it("uses Japanese name when familyNameJa and givenNameJa are provided", () => {
    const userWithJaNames: User = {
      ...baseUser,
      givenNameJa: "太郎",
      familyNameJa: "山田",
    }

    const dmp = initDmp(userWithJaNames)

    expect(dmp.personInfo).toHaveLength(1)
    expect(dmp.personInfo[0].lastName).toBe("山田")
    expect(dmp.personInfo[0].firstName).toBe("太郎")
  })

  it("falls back to English name for each field independently", () => {
    const userWithPartialJaNames: User = {
      ...baseUser,
      givenNameJa: "太郎",
      familyNameJa: null, // no Japanese last name
    }

    const dmp = initDmp(userWithPartialJaNames)

    expect(dmp.personInfo[0].lastName).toBe("Yamada") // fallback to English
    expect(dmp.personInfo[0].firstName).toBe("太郎") // Japanese name used
  })

  it("returns empty personInfo when user is null", () => {
    const dmp = initDmp(null)

    expect(dmp.personInfo).toHaveLength(0)
  })

  it("initializes with correct metadata defaults", () => {
    const dmp = initDmp(null)

    expect(dmp.metadata.revisionType).toBe("新規")
    expect(dmp.metadata.submissionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(dmp.linkedGrdmProjects).toEqual([])
    expect(dmp.dataInfo).toEqual([])
  })
})

describe("initPersonInfo", () => {
  it("includes grdmUserId as undefined", () => {
    const info = initPersonInfo()
    expect(info).toHaveProperty("grdmUserId", undefined)
  })

  it("includes source as undefined", () => {
    const info = initPersonInfo()
    expect(info).toHaveProperty("source", undefined)
  })
})

describe("personInfoSchema", () => {
  const base = {
    role: ["研究代表者"],
    lastName: "山田",
    firstName: "太郎",
    affiliation: "東京大学",
  }

  it("parses with grdmUserId and source fields", () => {
    const result = personInfoSchema.parse({
      ...base,
      grdmUserId: "abc123",
      source: { lastName: "grdm", firstName: "grdm", affiliation: "grdm", grdmUserId: "grdm" },
    })
    expect(result.grdmUserId).toBe("abc123")
    expect(result.source?.lastName).toBe("grdm")
    expect(result.source?.grdmUserId).toBe("grdm")
  })

  it("parses legacy format without grdmUserId or source (backward compatible)", () => {
    const result = personInfoSchema.parse(base)
    expect(result.grdmUserId).toBeUndefined()
    expect(result.source).toBeUndefined()
  })

  it("accepts all ValueSource values for each source field", () => {
    const sources = ["kaken", "grdm", "manual"] as const
    for (const s of sources) {
      const result = personInfoSchema.parse({ ...base, source: { lastName: s } })
      expect(result.source?.lastName).toBe(s)
    }
  })
})

describe("personInfoSourceSchema", () => {
  it("parses a full source object", () => {
    const result = personInfoSourceSchema.parse({
      role: "kaken",
      lastName: "kaken",
      firstName: "kaken",
      eRadResearcherId: "kaken",
      orcid: "grdm",
      affiliation: "manual",
      contact: "manual",
      grdmUserId: "grdm",
    })
    expect(result.role).toBe("kaken")
    expect(result.orcid).toBe("grdm")
    expect(result.affiliation).toBe("manual")
  })

  it("parses an empty object (all fields are optional)", () => {
    const result = personInfoSourceSchema.parse({})
    expect(result.role).toBeUndefined()
  })
})
