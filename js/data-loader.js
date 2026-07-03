// js/data-loader.js
// Loads the local monarch/location dataset and normalizes it into the flat
// shape the map and list pages expect: { people, monarchs, locations, burials, houseColors }

const HOUSE_COLORS = {
    'Wessex': '#ff7800', 'Denmark': '#2e8b57', 'Normandy': '#c9a400', 'Blois': '#4682b4',
    'Anjou': '#e63946', 'Plantagenet': '#dc143c', 'Lancaster': '#8b0000', 'York': '#6b6b6b',
    'Tudor': '#008080', 'Stuart': '#800080', 'Hanover': '#b8860b', 'Saxe-Coburg-Gotha': '#c9a400',
    'Saxe-Coburg and Gotha': '#c9a400', 'Windsor': '#1d4ed8', 'Commonwealth': '#555555',
    'Mercia': '#9370db', 'Dinefwr': '#228b22', 'Aberffraw': '#3cb371', 'Mathrafal': '#5f8f5a',
    'Deheubarth': '#6b8e23', 'Alpin': '#b8860b', 'Dunkeld': '#daa520', 'Balliol': '#8a8a4a',
    'Bruce': '#cd853f', 'Stewart': '#800080', 'Gwynedd': '#4B0082', 'Powys': '#800000',
    'Default': '#333333'
};

async function loadAndProcessData() {
    try {
        const response = await fetch('data/monarchs_data.json');
        if (!response.ok) throw new Error('Network response was not ok');

        const raw = await response.json();
        if (!raw.monarchs || !raw.locations) {
            throw new Error('Essential data (monarchs or locations) is missing from monarchs_data.json');
        }

        const people = Object.values(raw.monarchs).map(m => ({
            person_id: m.Monarch_Code,
            name: m.Name,
            title: m.Title,
            house: m.House,
            country: m.Country,
            isMonarch: true,
            birth_date: m.Birth_Date,
            death_date: m.Death_Date,
            reign_1_start: m.Reign_1_Start,
            reign_1_end: m.Reign_1_End,
            reign_2_start: m.Reign_2_Start,
            reign_2_end: m.Reign_2_End,
            place_of_burial: m.Place_of_Burial,
            burial_latitude: m.Burial_Latitude,
            burial_longitude: m.Burial_Longitude,
            spouses: (m.spouses || []).map(s => ({ name: s.Name || s.name, relationship_type: s.Relationship_Type || s.relationship_type })),
            issue: (m.issue || []).map(i => ({ name: i.Name || i.name, code: i.Monarch_Code || i.code }))
        }));

        const monarchs = people.slice();

        const locations = Object.values(raw.locations).map(l => ({
            location_id: l.Location_ID,
            location_name: l.Location_Name,
            city: l.City,
            map_latitude: l.Map_Latitude,
            map_longitude: l.Map_Longitude,
            floorplan_image_path: l.Floorplan_Image_Path,
            burials: (l.burials || []).map(b => ({
                person_id: b.Monarch_Code,
                location_id: b.Location_ID,
                body_part: b.Sub_Location_Name,
                floorplan_x: b.Floorplan_X,
                floorplan_y: b.Floorplan_Y,
                notes: b.Notes,
                monarch_name: b.Monarch_Name
            }))
        }));

        const burials = people
            .filter(p => p.person_id)
            .map(p => {
                const m = raw.monarchs[p.person_id];
                const detail = m && m.burial_details;
                return detail ? { person_id: p.person_id, location_id: detail.Location_ID } : null;
            })
            .filter(Boolean);

        return { people, monarchs, locations, burials, houseColors: HOUSE_COLORS };

    } catch (error) {
        console.error('Failed to load monarch data:', error);
        return null;
    }
}
