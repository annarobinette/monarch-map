// js/data-loader.js - Final Corrected Version

async function loadAndProcessData() {
    // IMPORTANT: Make sure this is your correct Web App URL from the Apps Script deployment.
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz_vb0m_NL35-GtYCcvWV47rznpTMq2WgKCZMCoV72gQZQu8F5OudzXBe_78gpd-DgpYQ/exec'; 

    try {
        const response = await fetch(WEB_APP_URL);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const rawData = await response.json();

        // Dynamically create the houseColors object
        const houseColors = {};
        
        // ▼▼▼ THIS IS THE CORRECTED LINE ▼▼▼
        rawData.housesAndColours.forEach(house => {
            // The headers inside the sheet are lowercase, e.g., 'house' and 'colour'
            if (house.house && house.colour) {
                houseColors[house.house] = house.colour;
            }
        });
        houseColors['Default'] = '#777777';

        // Process and join all the data into the final structure
        const allData = {
            monarchs: {},
            locations: {}
        };
        
        const peopleMap = new Map(rawData.people.map(p => [p.person_code, p]));
        
        rawData.locations.forEach(loc => {
            allData.locations[loc.location_id] = { 
                ...loc, 
                burials: rawData.burials.filter(b => b.location_id === loc.location_id)
            };
        });

        rawData.monarchs.forEach(monarchData => {
            const monarchCode = monarchData.monarch_code;
            const personDetails = peopleMap.get(monarchCode) || {};
            let monarch = { ...personDetails, ...monarchData };

            monarch.spouses = [];
            monarch.issue = [];
            monarch.burial_details = rawData.burials.filter(b => b.monarch_code === monarchCode);
            
            rawData.relationships
                .filter(r => r.person1_code === monarchCode)
                .forEach(rel => {
                    const spouseDetails = peopleMap.get(rel.person2_code);
                    if (spouseDetails) {
                        monarch.spouses.push({ ...spouseDetails, relationship_type: rel.relationship_type });
                    }
                });

            rawData.parentage
                .filter(p => p.parent_code === monarchCode)
                .forEach(p => {
                    const childDetails = peopleMap.get(p.child_code);
                    if (childDetails) {
                        const isMonarch = rawData.monarchs.some(m => m.monarch_code === childDetails.person_code);
                        monarch.issue.push({
                            code: childDetails.person_code,
                            name: childDetails.name,
                            is_monarch: isMonarch
                        });
                    }
                });
            
            allData.monarchs[monarchCode] = monarch;
        });

        console.log("Live data from Apps Script processed successfully!");
        return { allData, houseColors };

    } catch (error) {
        console.error("Failed to load or process live data from Google Apps Script:", error);
        return null; 
    }
}
