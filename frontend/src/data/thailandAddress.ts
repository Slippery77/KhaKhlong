type Subdistrict = {
  id: number
  name_th: string
  zip_code: number | string
}

type District = {
  id: number
  name_th: string
  subdistricts: Subdistrict[]
}

type Province = {
  id: number
  name_th: string
  districts: District[]
}

interface RawItem {
  id: number
  provinceCode: number
  provinceNameEn: string
  provinceNameTh: string
  districtCode: number
  districtNameEn: string
  districtNameTh: string
  subdistrictCode: number
  subdistrictNameEn: string
  subdistrictNameTh: string
  postalCode: number
}

import rawData from './thailand-address.json'

const items = rawData as RawItem[]

const provincesMap = new Map<number, Province>()

for (const item of items) {
  if (!provincesMap.has(item.provinceCode)) {
    provincesMap.set(item.provinceCode, {
      id: item.provinceCode,
      name_th: item.provinceNameTh,
      districts: [],
    })
  }

  const province = provincesMap.get(item.provinceCode)!
  let district = province.districts.find((d) => d.id === item.districtCode)
  if (!district) {
    district = {
      id: item.districtCode,
      name_th: item.districtNameTh,
      subdistricts: [],
    }
    province.districts.push(district)
  }

  district.subdistricts.push({
    id: item.subdistrictCode,
    name_th: item.subdistrictNameTh,
    zip_code: item.postalCode,
  })
}

const provincesData: Province[] = Array.from(provincesMap.values()).sort((a, b) =>
  a.name_th.localeCompare(b.name_th, 'th'),
)

for (const province of provincesData) {
  province.districts.sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'))
  for (const district of province.districts) {
    district.subdistricts.sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'))
  }
}

export function getProvinces(): Province[] {
  return provincesData
}

export function getProvinceByName(name: string): Province | undefined {
  return provincesData.find((p) => p.name_th === name)
}

export function getDistricts(provinceName: string): District[] {
  const province = getProvinceByName(provinceName)
  return province?.districts ?? []
}

export function getDistrictByName(provinceName: string, districtName: string): District | undefined {
  const districts = getDistricts(provinceName)
  return districts.find((d) => d.name_th === districtName)
}

export function getSubdistricts(provinceName: string, districtName: string): Subdistrict[] {
  const district = getDistrictByName(provinceName, districtName)
  return district?.subdistricts ?? []
}

export function getZipCode(provinceName: string, districtName: string, subdistrictName: string): string {
  const subdistricts = getSubdistricts(provinceName, districtName)
  const subdistrict = subdistricts.find((s) => s.name_th === subdistrictName)
  if (!subdistrict) return ''
  return String(subdistrict.zip_code)
}

export type { Province, District, Subdistrict }
