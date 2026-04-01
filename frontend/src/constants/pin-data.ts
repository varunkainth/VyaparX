// Types

export type StateType = "STATE" | "UT";

export interface Subzone {
  code: string;
  region: string;
  states: {
    name: string;
    type: StateType;
  }[];
}

export interface Zone {
  zone: number;
  name: string;
  subzones: Subzone[];
}

// Data

export const pinZones: Zone[] = [
  {
    zone: 1,
    name: "Northern",
    subzones: [
      {
        code: "11",
        region: "Delhi",
        states: [{ name: "Delhi", type: "UT" }]
      },
      {
        code: "12",
        region: "Haryana",
        states: [{ name: "Haryana", type: "STATE" }]
      },
      {
        code: "13",
        region: "Haryana",
        states: [{ name: "Haryana", type: "STATE" }]
      },
      {
        code: "14",
        region: "Punjab",
        states: [{ name: "Punjab", type: "STATE" }]
      },
      {
        code: "15",
        region: "Punjab",
        states: [{ name: "Punjab", type: "STATE" }]
      },
      {
        code: "16",
        region: "Chandigarh",
        states: [{ name: "Chandigarh", type: "UT" }]
      },
      {
        code: "17",
        region: "Himachal Pradesh",
        states: [{ name: "Himachal Pradesh", type: "STATE" }]
      },
      {
        code: "18",
        region: "Jammu & Kashmir",
        states: [
          { name: "Jammu & Kashmir", type: "UT" },
          { name: "Ladakh", type: "UT" }
        ]
      },
      {
        code: "19",
        region: "Jammu & Kashmir",
        states: [
          { name: "Jammu & Kashmir", type: "UT" },
          { name: "Ladakh", type: "UT" }
        ]
      }
    ]
  },

  {
    zone: 2,
    name: "North Central",
    subzones: [
      { code: "20", region: "Uttar Pradesh", states: [{ name: "Uttar Pradesh", type: "STATE" }] },
      { code: "21", region: "Uttar Pradesh", states: [{ name: "Uttar Pradesh", type: "STATE" }] },
      { code: "22", region: "Uttar Pradesh", states: [{ name: "Uttar Pradesh", type: "STATE" }] },
      { code: "23", region: "Uttar Pradesh", states: [{ name: "Uttar Pradesh", type: "STATE" }] },
      {
        code: "24",
        region: "Uttarakhand",
        states: [
          { name: "Uttarakhand", type: "STATE" },
          { name: "Uttar Pradesh", type: "STATE" }
        ]
      },
      {
        code: "25",
        region: "Uttarakhand",
        states: [
          { name: "Uttarakhand", type: "STATE" },
          { name: "Uttar Pradesh", type: "STATE" }
        ]
      },
      {
        code: "26",
        region: "Uttarakhand",
        states: [
          { name: "Uttarakhand", type: "STATE" },
          { name: "Uttar Pradesh", type: "STATE" }
        ]
      },
      { code: "27", region: "Uttar Pradesh", states: [{ name: "Uttar Pradesh", type: "STATE" }] },
      { code: "28", region: "Uttar Pradesh", states: [{ name: "Uttar Pradesh", type: "STATE" }] }
    ]
  },

  {
    zone: 3,
    name: "Western",
    subzones: [
      { code: "30", region: "Rajasthan", states: [{ name: "Rajasthan", type: "STATE" }] },
      { code: "31", region: "Rajasthan", states: [{ name: "Rajasthan", type: "STATE" }] },
      { code: "32", region: "Rajasthan", states: [{ name: "Rajasthan", type: "STATE" }] },
      { code: "33", region: "Rajasthan", states: [{ name: "Rajasthan", type: "STATE" }] },
      { code: "34", region: "Rajasthan", states: [{ name: "Rajasthan", type: "STATE" }] },
      {
        code: "35",
        region: "DNH & Daman & Diu",
        states: [{ name: "Dadra & Nagar Haveli and Daman & Diu", type: "UT" }]
      },
      { code: "36", region: "Gujarat", states: [{ name: "Gujarat", type: "STATE" }] },
      { code: "37", region: "Gujarat", states: [{ name: "Gujarat", type: "STATE" }] },
      { code: "38", region: "Gujarat", states: [{ name: "Gujarat", type: "STATE" }] },
      { code: "39", region: "Gujarat", states: [{ name: "Gujarat", type: "STATE" }] }
    ]
  },

  {
    zone: 4,
    name: "Central-West",
    subzones: [
      { code: "40", region: "Maharashtra", states: [{ name: "Maharashtra", type: "STATE" }] },
      { code: "41", region: "Maharashtra", states: [{ name: "Maharashtra", type: "STATE" }] },
      { code: "42", region: "Maharashtra", states: [{ name: "Maharashtra", type: "STATE" }] },
      { code: "43", region: "Maharashtra", states: [{ name: "Maharashtra", type: "STATE" }] },
      { code: "44", region: "Maharashtra", states: [{ name: "Maharashtra", type: "STATE" }] },
      { code: "45", region: "Madhya Pradesh", states: [{ name: "Madhya Pradesh", type: "STATE" }] },
      { code: "46", region: "Madhya Pradesh", states: [{ name: "Madhya Pradesh", type: "STATE" }] },
      { code: "47", region: "Madhya Pradesh", states: [{ name: "Madhya Pradesh", type: "STATE" }] },
      { code: "48", region: "Madhya Pradesh", states: [{ name: "Madhya Pradesh", type: "STATE" }] },
      { code: "49", region: "Chhattisgarh", states: [{ name: "Chhattisgarh", type: "STATE" }] }
    ]
  },
   {
      "zone": 5,
      "name": "South-Central",
      "subzones": [
        { "code": "50", "region": "Telangana", "states": [{ name: "Telangana", type: "STATE" }] },
        { "code": "51", "region": "Andhra Pradesh", "states": [{ name: "Andhra Pradesh", type: "STATE" }, { name: "Telangana", type: "STATE" }] },
        { "code": "52", "region": "Andhra Pradesh", "states": [{ name: "Andhra Pradesh", type: "STATE" }] },
        { "code": "53", "region": "Andhra Pradesh", "states": [{ name: "Andhra Pradesh", type: "STATE" }] },
        { "code": "56", "region": "Karnataka", "states": [{ name: "Karnataka", type: "STATE" }] },
        { "code": "57", "region": "Karnataka", "states": [{ name: "Karnataka", type: "STATE" }] },
        { "code": "58", "region": "Karnataka", "states": [{ name: "Karnataka", type: "STATE" }] },
        { "code": "59", "region": "Karnataka", "states": [{ name: "Karnataka", type: "STATE" }] }
      ]
    },
    {
      "zone": 6,
      "name": "Southern",
      "subzones": [
        { "code": "60", "region": "Tamil Nadu", "states": [{ name: "Tamil Nadu", type: "STATE" }, { name: "Puducherry", type: "UT" }] },
        { "code": "61", "region": "Tamil Nadu", "states": [{ name: "Tamil Nadu", type: "STATE" }, { name: "Puducherry", type: "UT" }] },
        { "code": "62", "region": "Tamil Nadu", "states": [{ name: "Tamil Nadu", type: "STATE" }] },
        { "code": "63", "region": "Tamil Nadu", "states": [{ name: "Tamil Nadu", type: "STATE" }] },
        { "code": "64", "region": "Tamil Nadu", "states": [{ name: "Tamil Nadu", type: "STATE" }] },
        { "code": "67", "region": "Kerala", "states": [{ name: "Kerala", type: "STATE" }] },
        { "code": "68", "region": "Kerala", "states": [{ name: "Kerala", type: "STATE" }, { name: "Lakshadweep", type: "UT" }] },
        { "code": "69", "region": "Kerala", "states": [{ name: "Kerala", type: "STATE" }] }
      ]
    },
    {
      "zone": 7,
      "name": "Eastern & North-East",
      "subzones": [
        { "code": "70", "region": "West Bengal", "states": [{ name: "West Bengal", type: "STATE" }] },
        { "code": "71", "region": "West Bengal", "states": [{ name: "West Bengal", type: "STATE" }] },
        { "code": "72", "region": "West Bengal", "states": [{ name: "West Bengal", type: "STATE" }] },
        { "code": "73", "region": "Sikkim", "states": [{ name: "Sikkim", type: "STATE" }] },
        { "code": "74", "region": "West Bengal", "states": [{ name: "West Bengal", type: "STATE" }] },
        { "code": "75", "region": "Odisha", "states": [{ name: "Odisha", type: "STATE" }] },
        { "code": "76", "region": "Odisha", "states": [{ name: "Odisha", type: "STATE" }] },
        { "code": "77", "region": "Odisha", "states": [{ name: "Odisha", type: "STATE" }] },
        { "code": "78", "region": "Assam", "states": [{ name: "Assam", type: "STATE" }] },
        { "code": "79", "region": "North-East", "states": [{ name: "Arunachal Pradesh", type: "STATE" }, { name: "Manipur", type: "STATE" }, { name: "Meghalaya", type: "STATE" }, { name: "Mizoram", type: "STATE" }, { name: "Nagaland", type: "STATE" }, { name: "Tripura", type: "STATE" }] }
      ]
    },
    {
      "zone": 8,
      "name": "Bihar Region",
      "subzones": [
        { "code": "80", "region": "Bihar", "states": [{ name: "Bihar", type: "STATE" }] },
        { "code": "81", "region": "Jharkhand", "states": [{ name: "Jharkhand", type: "STATE" }] },
        { "code": "82", "region": "Jharkhand", "states": [{ name: "Jharkhand", type: "STATE" }] },
        { "code": "83", "region": "Jharkhand", "states": [{ name: "Jharkhand", type: "STATE" }] },
        { "code": "84", "region": "Bihar", "states": [{ name: "Bihar", type: "STATE" }] },
        { "code": "85", "region": "Bihar", "states": [{ name: "Bihar", type: "STATE" }] }
      ]
    },
    {
      "zone": 9,
      "name": "Army Postal Service",
      "subzones": [
        { "code": "90", "region": "APS", "states": [{ name: "Army Postal Service", type: "UT" }] },
        { "code": "91", "region": "APS", "states": [{ name: "Army Postal Service", type: "UT" }] },
        { "code": "92", "region": "APS", "states": [{ name: "Army Postal Service", type: "UT" }] },
        { "code": "93", "region": "APS", "states": [{ name: "Army Postal Service", type: "UT" }] },
        { "code": "94", "region": "APS", "states": [{ name: "Army Postal Service", type: "UT" }] },
        { "code": "95", "region": "APS", "states": [{ name: "Army Postal Service", type: "UT" }] },
        { "code": "96", "region": "APS", "states": [{ name: "Army Postal Service", type: "UT" }] },
        { "code": "97", "region": "APS", "states": [{ name: "Army Postal Service", type: "UT" }] },
        { "code": "98", "region": "APS", "states": [{ name: "Army Postal Service", type: "UT" }] },
        { "code": "99", "region": "APS", "states": [{ name: "Army Postal Service", type: "UT" }] }
      ]
    }

  
];