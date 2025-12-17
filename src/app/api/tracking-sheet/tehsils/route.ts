import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get('district');

    // Define tehsils for each district
    const districtTehsils: Record<string, string[]> = {
      'DIK': [
        'Dera Ismail Khan Tehsil',
        'Paroa Tehsil',
        'Kulachi Tehsil',
        'Daraban Tehsil',
        'Local Area (Ex-FR DI Khan) Tehsil'
      ],
      'Bannu': [
        'Bannu Tehsil',
        'Domel Tehsil',
        'Kakki Tehsil',
        'Baka Khel Tehsil',
        'Miryan Tehsil',
        'Wazir Tehsil'
      ],
      'Paharpur': [
        'Paniala'
      ]
    };

    let tehsils: string[] = [];

    if (district && district !== 'ALL') {
      // Return tehsils for the specific district
      tehsils = districtTehsils[district] || [];
    } else {
      // Return all tehsils from all districts
      tehsils = [
        ...districtTehsils['DIK'],
        ...districtTehsils['Bannu'],
        ...districtTehsils['Paharpur']
      ];
    }

    return NextResponse.json({
      success: true,
      tehsils: tehsils
    });
  } catch (error) {
    console.error('Error fetching tehsils:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch tehsils',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

