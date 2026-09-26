/** Bangladesh: 8 divisions → 64 districts. Served to the app via GET /api/meta. */
export const DIVISIONS: { name: string; nameBn: string; districts: string[] }[] = [
  {
    name: "Barishal",
    nameBn: "বরিশাল",
    districts: ["Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"],
  },
  {
    name: "Chattogram",
    nameBn: "চট্টগ্রাম",
    districts: [
      "Bandarban",
      "Brahmanbaria",
      "Chandpur",
      "Chattogram",
      "Cox's Bazar",
      "Cumilla",
      "Feni",
      "Khagrachhari",
      "Lakshmipur",
      "Noakhali",
      "Rangamati",
    ],
  },
  {
    name: "Dhaka",
    nameBn: "ঢাকা",
    districts: [
      "Dhaka",
      "Faridpur",
      "Gazipur",
      "Gopalganj",
      "Kishoreganj",
      "Madaripur",
      "Manikganj",
      "Munshiganj",
      "Narayanganj",
      "Narsingdi",
      "Rajbari",
      "Shariatpur",
      "Tangail",
    ],
  },
  {
    name: "Khulna",
    nameBn: "খুলনা",
    districts: [
      "Bagerhat",
      "Chuadanga",
      "Jashore",
      "Jhenaidah",
      "Khulna",
      "Kushtia",
      "Magura",
      "Meherpur",
      "Narail",
      "Satkhira",
    ],
  },
  {
    name: "Mymensingh",
    nameBn: "ময়মনসিংহ",
    districts: ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
  },
  {
    name: "Rajshahi",
    nameBn: "রাজশাহী",
    districts: ["Bogura", "Chapainawabganj", "Joypurhat", "Naogaon", "Natore", "Pabna", "Rajshahi", "Sirajganj"],
  },
  {
    name: "Rangpur",
    nameBn: "রংপুর",
    districts: ["Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon"],
  },
  {
    name: "Sylhet",
    nameBn: "সিলেট",
    districts: ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"],
  },
];

const districtToDivision = new Map<string, string>();
for (const d of DIVISIONS) for (const district of d.districts) districtToDivision.set(district, d.name);

export function isValidLocation(division: string, district: string) {
  return districtToDivision.get(district) === division;
}
