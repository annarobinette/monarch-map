// js/data-loader.js

async function loadAndProcessData() {
    // 1. Unique Google Sheet ID.
    const SHEET_ID = '1ekOIHTOZtCo7xLmVEkMi5yUAxWMwB-twLww2AyJE2Xw'; 
    
    // 2. JSON links
    const urls = {
        housesAndColours: `https://spreadsheets.google.com/feeds/list/${SHEET_ID}/2/public/values?alt=json`,
        people:           `https://spreadsheets.google.com/feeds/list/${SHEET_ID}/3/public/values?alt=json`,
        monarchs:         `https://spreadsheets.google.com/feeds/list/${SHEET_ID}/4/public/values?alt=json`,
        relationships:    `https://spreadsheets.google.com/feeds/list/${SHEET_ID}/5/public/values?alt=json`,
        parentage:        `https://spreadsheets.google.com/feeds/list/${SHEET_ID}/6/public/values?alt=json`,
        burials:          `https://spreadsheets.google.com/feeds/list/${SHEET_ID}/7/public/values?alt=json`,
        locations:        `https://spreadsheets.google.com/feeds/list/${SHEET_ID}/8/public/values?alt=json`
    };

    // Helper function to clean the messy JSON format from Google's API
    function cleanGoogleSheetData(data) {
        if (!data || !data.feed || !data.feed.entry) return [];
        return data.feed.entry.map(entry => {
            const row = {};
            for (const key in entry) {
                if (key.startsWith('gsx$')) {
                    const newKey = key.substring(4);
                    row[newKey] = entry[key].$t || '';
                }
            }
            return row;
        });
    }

    try {
        // 3. Fetch all sheets concurrently.
        const responses = await Promise.all(Object.values(urls).map(url => fetch(url)));
        const jsonData = await Promise.all(responses.map(res => res.json()));

        // 4. Clean the raw data from each sheet.
        const housesList = cleanGoogleSheetData(jsonData[0]);
        const peopleList = cleanGoogleSheetData(jsonData[1]);
        const monarchsList = cleanGoogleSheetData(jsonData[2]);
        const relationshipsList = cleanGoogleSheetData(jsonData[3]);
        const parentageList = cleanGoogleSheetData(jsonData[4]);
        const burialsList = cleanGoogleSheetData(jsonData[5]);
        const locationsList = cleanGoogleSheetData(jsonData[6]);
        
        const peopleMap = new Map(peopleList.map(p => [p.person_code, p]));

        // 5. Dynamically create the houseColors object from your sheet.
        const houseColors = {};
        housesList.forEach(house => {
            if (house.house && house.colour) {
                houseColors[house.house] = house.colour;
            }
        });
        houseColors['Default'] = '#777777';

        // 6. Process and join the data into the final structure.
        const allData = {
            monarchs: {},
            locations: {}
        };

        locationsList.forEach(loc => {
            allData.locations[loc.location_id] = { 
                ...loc, 
                burials: burialsList.filter(b => b.location_id === loc.location_id)
            };
        });

        monarchsList.forEach(monarchData => {
            const monarchCode = monarchData.monarch_code;
            const personDetails = peopleMap.get(monarchCode) || {};
            let monarch = { ...personDetails, ...monarchData };

            monarch.spouses = [];
            monarch.issue = [];
            monarch.burial_details = burialsList.filter(b => b.monarch_code === monarchCode);
            
            relationshipsList
                .filter(r => r.person1_code === monarchCode)
                .forEach(rel => {
                    const spouseDetails = peopleMap.get(rel.person2_code);
                    if (spouseDetails) {
                        monarch.spouses.push({ ...spouseDetails, relationship_type: rel.relationship_type });
                    }
                });

            parentageList
                .filter(p => p.parent_code === monarchCode)
                .forEach(p => {
                    const childDetails = peopleMap.get(p.child_code);
                    if (childDetails) {
                        const isMonarch = monarchsList.some(m => m.monarch_code === childDetails.person_code);
                        monarch.issue.push({
                            code: childDetails.person_code,
                            name: childDetails.name,
                            is_monarch: isMonarch
                        });
                    }
                });
            
            allData.monarchs[monarchCode] = monarch;
        });

        console.log("Live data processed successfully!");
        return { allData, houseColors };

    } catch (error) {
        console.error("Failed to load or process live data from Google Sheets:", error);
        return null; 
    }
}
