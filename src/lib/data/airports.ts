export interface Airport {
  code: string
  city: string
  country: string
  name: string
}

export const MAJOR_AIRPORTS: Airport[] = [
  // North America - USA
  { code: 'JFK', city: 'New York', country: 'USA', name: 'John F. Kennedy International' },
  { code: 'LGA', city: 'New York', country: 'USA', name: 'LaGuardia' },
  { code: 'EWR', city: 'Newark', country: 'USA', name: 'Newark Liberty International' },
  { code: 'LAX', city: 'Los Angeles', country: 'USA', name: 'Los Angeles International' },
  { code: 'ORD', city: 'Chicago', country: 'USA', name: "O'Hare International" },
  { code: 'MDW', city: 'Chicago', country: 'USA', name: 'Midway International' },
  { code: 'ATL', city: 'Atlanta', country: 'USA', name: 'Hartsfield-Jackson Atlanta International' },
  { code: 'DFW', city: 'Dallas', country: 'USA', name: 'Dallas/Fort Worth International' },
  { code: 'DEN', city: 'Denver', country: 'USA', name: 'Denver International' },
  { code: 'SFO', city: 'San Francisco', country: 'USA', name: 'San Francisco International' },
  { code: 'SEA', city: 'Seattle', country: 'USA', name: 'Seattle-Tacoma International' },
  { code: 'LAS', city: 'Las Vegas', country: 'USA', name: 'Harry Reid International' },
  { code: 'MCO', city: 'Orlando', country: 'USA', name: 'Orlando International' },
  { code: 'MIA', city: 'Miami', country: 'USA', name: 'Miami International' },
  { code: 'BOS', city: 'Boston', country: 'USA', name: 'Logan International' },
  { code: 'IAH', city: 'Houston', country: 'USA', name: 'George Bush Intercontinental' },
  { code: 'PHX', city: 'Phoenix', country: 'USA', name: 'Phoenix Sky Harbor International' },
  { code: 'IAD', city: 'Washington', country: 'USA', name: 'Washington Dulles International' },
  { code: 'DCA', city: 'Washington', country: 'USA', name: 'Ronald Reagan Washington National' },
  { code: 'MSP', city: 'Minneapolis', country: 'USA', name: 'Minneapolis-St Paul International' },
  { code: 'DTW', city: 'Detroit', country: 'USA', name: 'Detroit Metropolitan Wayne County' },
  { code: 'PHL', city: 'Philadelphia', country: 'USA', name: 'Philadelphia International' },
  { code: 'CLT', city: 'Charlotte', country: 'USA', name: 'Charlotte Douglas International' },
  { code: 'SAN', city: 'San Diego', country: 'USA', name: 'San Diego International' },
  { code: 'PDX', city: 'Portland', country: 'USA', name: 'Portland International' },
  { code: 'SLC', city: 'Salt Lake City', country: 'USA', name: 'Salt Lake City International' },
  { code: 'HNL', city: 'Honolulu', country: 'USA', name: 'Daniel K. Inouye International' },
  { code: 'ANC', city: 'Anchorage', country: 'USA', name: 'Ted Stevens Anchorage International' },
  
  // North America - Canada
  { code: 'YYZ', city: 'Toronto', country: 'Canada', name: 'Toronto Pearson International' },
  { code: 'YVR', city: 'Vancouver', country: 'Canada', name: 'Vancouver International' },
  { code: 'YUL', city: 'Montreal', country: 'Canada', name: 'Montréal-Pierre Elliott Trudeau International' },
  { code: 'YYC', city: 'Calgary', country: 'Canada', name: 'Calgary International' },
  { code: 'YEG', city: 'Edmonton', country: 'Canada', name: 'Edmonton International' },
  { code: 'YOW', city: 'Ottawa', country: 'Canada', name: 'Ottawa Macdonald-Cartier International' },
  
  // North America - Mexico & Caribbean
  { code: 'MEX', city: 'Mexico City', country: 'Mexico', name: 'Mexico City International' },
  { code: 'CUN', city: 'Cancún', country: 'Mexico', name: 'Cancún International' },
  { code: 'GDL', city: 'Guadalajara', country: 'Mexico', name: 'Guadalajara International' },
  { code: 'SJD', city: 'Los Cabos', country: 'Mexico', name: 'Los Cabos International' },
  { code: 'PVR', city: 'Puerto Vallarta', country: 'Mexico', name: 'Licenciado Gustavo Díaz Ordaz International' },
  { code: 'SJU', city: 'San Juan', country: 'Puerto Rico', name: 'Luis Muñoz Marín International' },
  { code: 'NAS', city: 'Nassau', country: 'Bahamas', name: 'Lynden Pindling International' },
  { code: 'MBJ', city: 'Montego Bay', country: 'Jamaica', name: 'Sangster International' },
  { code: 'PUJ', city: 'Punta Cana', country: 'Dominican Republic', name: 'Punta Cana International' },
  
  // Europe - UK & Ireland
  { code: 'LHR', city: 'London', country: 'UK', name: 'Heathrow' },
  { code: 'LGW', city: 'London', country: 'UK', name: 'Gatwick' },
  { code: 'LTN', city: 'London', country: 'UK', name: 'Luton' },
  { code: 'STN', city: 'London', country: 'UK', name: 'Stansted' },
  { code: 'LCY', city: 'London', country: 'UK', name: 'London City' },
  { code: 'MAN', city: 'Manchester', country: 'UK', name: 'Manchester Airport' },
  { code: 'EDI', city: 'Edinburgh', country: 'UK', name: 'Edinburgh Airport' },
  { code: 'GLA', city: 'Glasgow', country: 'UK', name: 'Glasgow Airport' },
  { code: 'BHX', city: 'Birmingham', country: 'UK', name: 'Birmingham Airport' },
  { code: 'DUB', city: 'Dublin', country: 'Ireland', name: 'Dublin Airport' },
  
  // Europe - France
  { code: 'CDG', city: 'Paris', country: 'France', name: 'Charles de Gaulle' },
  { code: 'ORY', city: 'Paris', country: 'France', name: 'Orly' },
  { code: 'NCE', city: 'Nice', country: 'France', name: 'Nice Côte d\'Azur' },
  { code: 'LYS', city: 'Lyon', country: 'France', name: 'Lyon-Saint Exupéry' },
  { code: 'MRS', city: 'Marseille', country: 'France', name: 'Marseille Provence' },
  { code: 'TLS', city: 'Toulouse', country: 'France', name: 'Toulouse-Blagnac' },
  
  // Europe - Germany
  { code: 'FRA', city: 'Frankfurt', country: 'Germany', name: 'Frankfurt Airport' },
  { code: 'MUC', city: 'Munich', country: 'Germany', name: 'Munich Airport' },
  { code: 'BER', city: 'Berlin', country: 'Germany', name: 'Berlin Brandenburg' },
  { code: 'DUS', city: 'Düsseldorf', country: 'Germany', name: 'Düsseldorf Airport' },
  { code: 'HAM', city: 'Hamburg', country: 'Germany', name: 'Hamburg Airport' },
  { code: 'CGN', city: 'Cologne', country: 'Germany', name: 'Cologne Bonn Airport' },
  
  // Europe - Spain & Portugal
  { code: 'MAD', city: 'Madrid', country: 'Spain', name: 'Adolfo Suárez Madrid-Barajas' },
  { code: 'BCN', city: 'Barcelona', country: 'Spain', name: 'Barcelona-El Prat' },
  { code: 'AGP', city: 'Málaga', country: 'Spain', name: 'Málaga-Costa del Sol' },
  { code: 'PMI', city: 'Palma de Mallorca', country: 'Spain', name: 'Palma de Mallorca Airport' },
  { code: 'SVQ', city: 'Seville', country: 'Spain', name: 'Seville Airport' },
  { code: 'VLC', city: 'Valencia', country: 'Spain', name: 'Valencia Airport' },
  { code: 'LIS', city: 'Lisbon', country: 'Portugal', name: 'Lisbon Portela' },
  { code: 'OPO', city: 'Porto', country: 'Portugal', name: 'Porto Airport' },
  { code: 'FAO', city: 'Faro', country: 'Portugal', name: 'Faro Airport' },
  
  // Europe - Italy
  { code: 'FCO', city: 'Rome', country: 'Italy', name: 'Leonardo da Vinci-Fiumicino' },
  { code: 'CIA', city: 'Rome', country: 'Italy', name: 'Ciampino' },
  { code: 'MXP', city: 'Milan', country: 'Italy', name: 'Malpensa' },
  { code: 'LIN', city: 'Milan', country: 'Italy', name: 'Linate' },
  { code: 'VCE', city: 'Venice', country: 'Italy', name: 'Venice Marco Polo' },
  { code: 'NAP', city: 'Naples', country: 'Italy', name: 'Naples International' },
  { code: 'FLR', city: 'Florence', country: 'Italy', name: 'Florence Airport' },
  { code: 'BLQ', city: 'Bologna', country: 'Italy', name: 'Bologna Guglielmo Marconi' },
  { code: 'CTA', city: 'Catania', country: 'Italy', name: 'Catania-Fontanarossa' },
  
  // Europe - Netherlands, Belgium, Switzerland
  { code: 'AMS', city: 'Amsterdam', country: 'Netherlands', name: 'Schiphol' },
  { code: 'BRU', city: 'Brussels', country: 'Belgium', name: 'Brussels Airport' },
  { code: 'ZRH', city: 'Zurich', country: 'Switzerland', name: 'Zurich Airport' },
  { code: 'GVA', city: 'Geneva', country: 'Switzerland', name: 'Geneva Airport' },
  
  // Europe - Austria, Greece, Turkey
  { code: 'VIE', city: 'Vienna', country: 'Austria', name: 'Vienna International' },
  { code: 'ATH', city: 'Athens', country: 'Greece', name: 'Athens International' },
  { code: 'HER', city: 'Heraklion', country: 'Greece', name: 'Heraklion International' },
  { code: 'SKG', city: 'Thessaloniki', country: 'Greece', name: 'Thessaloniki Airport' },
  { code: 'IST', city: 'Istanbul', country: 'Turkey', name: 'Istanbul Airport' },
  { code: 'SAW', city: 'Istanbul', country: 'Turkey', name: 'Sabiha Gökçen International' },
  { code: 'AYT', city: 'Antalya', country: 'Turkey', name: 'Antalya Airport' },
  { code: 'ESB', city: 'Ankara', country: 'Turkey', name: 'Esenboğa International' },
  { code: 'ADB', city: 'Izmir', country: 'Turkey', name: 'Adnan Menderes Airport' },
  
  // Europe - Scandinavia
  { code: 'CPH', city: 'Copenhagen', country: 'Denmark', name: 'Copenhagen Airport' },
  { code: 'ARN', city: 'Stockholm', country: 'Sweden', name: 'Stockholm Arlanda' },
  { code: 'OSL', city: 'Oslo', country: 'Norway', name: 'Oslo Airport' },
  { code: 'HEL', city: 'Helsinki', country: 'Finland', name: 'Helsinki-Vantaa' },
  { code: 'GOT', city: 'Gothenburg', country: 'Sweden', name: 'Gothenburg Landvetter' },
  { code: 'BGO', city: 'Bergen', country: 'Norway', name: 'Bergen Airport' },
  { code: 'KEF', city: 'Reykjavik', country: 'Iceland', name: 'Keflavík International' },
  
  // Europe - Eastern Europe
  { code: 'WAW', city: 'Warsaw', country: 'Poland', name: 'Warsaw Chopin' },
  { code: 'KRK', city: 'Krakow', country: 'Poland', name: 'Kraków John Paul II International' },
  { code: 'PRG', city: 'Prague', country: 'Czech Republic', name: 'Václav Havel Airport Prague' },
  { code: 'BUD', city: 'Budapest', country: 'Hungary', name: 'Budapest Ferenc Liszt International' },
  { code: 'OTP', city: 'Bucharest', country: 'Romania', name: 'Henri Coandă International' },
  { code: 'SOF', city: 'Sofia', country: 'Bulgaria', name: 'Sofia Airport' },
  
  // Middle East - Israel & Jordan (PRIORITY)
  { code: 'TLV', city: 'Tel Aviv', country: 'Israel', name: 'Ben Gurion Airport' },
  { code: 'AMM', city: 'Amman', country: 'Jordan', name: 'Queen Alia International' },
  { code: 'AQJ', city: 'Aqaba', country: 'Jordan', name: 'King Hussein International' },
  
  // Middle East - UAE & Gulf Countries
  { code: 'DXB', city: 'Dubai', country: 'UAE', name: 'Dubai International' },
  { code: 'DWC', city: 'Dubai', country: 'UAE', name: 'Al Maktoum International' },
  { code: 'AUH', city: 'Abu Dhabi', country: 'UAE', name: 'Abu Dhabi International' },
  { code: 'SHJ', city: 'Sharjah', country: 'UAE', name: 'Sharjah International' },
  { code: 'DOH', city: 'Doha', country: 'Qatar', name: 'Hamad International' },
  { code: 'KWI', city: 'Kuwait City', country: 'Kuwait', name: 'Kuwait International' },
  { code: 'BAH', city: 'Manama', country: 'Bahrain', name: 'Bahrain International' },
  { code: 'MCT', city: 'Muscat', country: 'Oman', name: 'Muscat International' },
  { code: 'RUH', city: 'Riyadh', country: 'Saudi Arabia', name: 'King Khalid International' },
  { code: 'JED', city: 'Jeddah', country: 'Saudi Arabia', name: 'King Abdulaziz International' },
  { code: 'DMM', city: 'Dammam', country: 'Saudi Arabia', name: 'King Fahd International' },
  
  // Middle East - Other
  { code: 'BEY', city: 'Beirut', country: 'Lebanon', name: 'Beirut-Rafic Hariri International' },
  
  // North Africa
  { code: 'CAI', city: 'Cairo', country: 'Egypt', name: 'Cairo International' },
  { code: 'SSH', city: 'Sharm El Sheikh', country: 'Egypt', name: 'Sharm El Sheikh International' },
  { code: 'HRG', city: 'Hurghada', country: 'Egypt', name: 'Hurghada International' },
  { code: 'CMN', city: 'Casablanca', country: 'Morocco', name: 'Mohammed V International' },
  { code: 'RAK', city: 'Marrakech', country: 'Morocco', name: 'Marrakech Menara' },
  { code: 'TUN', city: 'Tunis', country: 'Tunisia', name: 'Tunis-Carthage International' },
  { code: 'ALG', city: 'Algiers', country: 'Algeria', name: 'Houari Boumediene Airport' },
  
  // Sub-Saharan Africa
  { code: 'JNB', city: 'Johannesburg', country: 'South Africa', name: 'O.R. Tambo International' },
  { code: 'CPT', city: 'Cape Town', country: 'South Africa', name: 'Cape Town International' },
  { code: 'DUR', city: 'Durban', country: 'South Africa', name: 'King Shaka International' },
  { code: 'NBO', city: 'Nairobi', country: 'Kenya', name: 'Jomo Kenyatta International' },
  { code: 'ADD', city: 'Addis Ababa', country: 'Ethiopia', name: 'Addis Ababa Bole International' },
  { code: 'LOS', city: 'Lagos', country: 'Nigeria', name: 'Murtala Muhammed International' },
  { code: 'ACC', city: 'Accra', country: 'Ghana', name: 'Kotoka International' },
  { code: 'DAR', city: 'Dar es Salaam', country: 'Tanzania', name: 'Julius Nyerere International' },
  { code: 'MRU', city: 'Mauritius', country: 'Mauritius', name: 'Sir Seewoosagur Ramgoolam International' },
  
  // Asia - Japan
  { code: 'HND', city: 'Tokyo', country: 'Japan', name: 'Haneda' },
  { code: 'NRT', city: 'Tokyo', country: 'Japan', name: 'Narita International' },
  { code: 'KIX', city: 'Osaka', country: 'Japan', name: 'Kansai International' },
  { code: 'ITM', city: 'Osaka', country: 'Japan', name: 'Osaka International (Itami)' },
  { code: 'NGO', city: 'Nagoya', country: 'Japan', name: 'Chubu Centrair International' },
  { code: 'FUK', city: 'Fukuoka', country: 'Japan', name: 'Fukuoka Airport' },
  { code: 'CTS', city: 'Sapporo', country: 'Japan', name: 'New Chitose Airport' },
  
  // Asia - China
  { code: 'PEK', city: 'Beijing', country: 'China', name: 'Beijing Capital International' },
  { code: 'PKX', city: 'Beijing', country: 'China', name: 'Beijing Daxing International' },
  { code: 'PVG', city: 'Shanghai', country: 'China', name: 'Shanghai Pudong International' },
  { code: 'SHA', city: 'Shanghai', country: 'China', name: 'Shanghai Hongqiao International' },
  { code: 'CAN', city: 'Guangzhou', country: 'China', name: 'Guangzhou Baiyun International' },
  { code: 'SZX', city: 'Shenzhen', country: 'China', name: 'Shenzhen Bao\'an International' },
  { code: 'HKG', city: 'Hong Kong', country: 'Hong Kong', name: 'Hong Kong International' },
  { code: 'CTU', city: 'Chengdu', country: 'China', name: 'Chengdu Shuangliu International' },
  { code: 'XIY', city: 'Xi\'an', country: 'China', name: 'Xi\'an Xianyang International' },
  
  // Asia - South Korea
  { code: 'ICN', city: 'Seoul', country: 'South Korea', name: 'Incheon International' },
  { code: 'GMP', city: 'Seoul', country: 'South Korea', name: 'Gimpo International' },
  { code: 'PUS', city: 'Busan', country: 'South Korea', name: 'Gimhae International' },
  
  // Asia - Southeast Asia
  { code: 'SIN', city: 'Singapore', country: 'Singapore', name: 'Singapore Changi' },
  { code: 'BKK', city: 'Bangkok', country: 'Thailand', name: 'Suvarnabhumi' },
  { code: 'DMK', city: 'Bangkok', country: 'Thailand', name: 'Don Mueang International' },
  { code: 'HKT', city: 'Phuket', country: 'Thailand', name: 'Phuket International' },
  { code: 'CNX', city: 'Chiang Mai', country: 'Thailand', name: 'Chiang Mai International' },
  { code: 'KUL', city: 'Kuala Lumpur', country: 'Malaysia', name: 'Kuala Lumpur International' },
  { code: 'PEN', city: 'Penang', country: 'Malaysia', name: 'Penang International' },
  { code: 'CGK', city: 'Jakarta', country: 'Indonesia', name: 'Soekarno-Hatta International' },
  { code: 'DPS', city: 'Bali', country: 'Indonesia', name: 'Ngurah Rai International' },
  { code: 'SUB', city: 'Surabaya', country: 'Indonesia', name: 'Juanda International' },
  { code: 'MNL', city: 'Manila', country: 'Philippines', name: 'Ninoy Aquino International' },
  { code: 'CEB', city: 'Cebu', country: 'Philippines', name: 'Mactan-Cebu International' },
  { code: 'HAN', city: 'Hanoi', country: 'Vietnam', name: 'Noi Bai International' },
  { code: 'SGN', city: 'Ho Chi Minh City', country: 'Vietnam', name: 'Tan Son Nhat International' },
  { code: 'DAD', city: 'Da Nang', country: 'Vietnam', name: 'Da Nang International' },
  { code: 'REP', city: 'Siem Reap', country: 'Cambodia', name: 'Siem Reap International' },
  { code: 'RGN', city: 'Yangon', country: 'Myanmar', name: 'Yangon International' },
  
  // Asia - South Asia
  { code: 'DEL', city: 'Delhi', country: 'India', name: 'Indira Gandhi International' },
  { code: 'BOM', city: 'Mumbai', country: 'India', name: 'Chhatrapati Shivaji Maharaj International' },
  { code: 'BLR', city: 'Bangalore', country: 'India', name: 'Kempegowda International' },
  { code: 'MAA', city: 'Chennai', country: 'India', name: 'Chennai International' },
  { code: 'HYD', city: 'Hyderabad', country: 'India', name: 'Rajiv Gandhi International' },
  { code: 'CCU', city: 'Kolkata', country: 'India', name: 'Netaji Subhas Chandra Bose International' },
  { code: 'GOI', city: 'Goa', country: 'India', name: 'Goa International' },
  { code: 'CMB', city: 'Colombo', country: 'Sri Lanka', name: 'Bandaranaike International' },
  { code: 'KTM', city: 'Kathmandu', country: 'Nepal', name: 'Tribhuvan International' },
  { code: 'DAC', city: 'Dhaka', country: 'Bangladesh', name: 'Hazrat Shahjalal International' },
  { code: 'ISB', city: 'Islamabad', country: 'Pakistan', name: 'Islamabad International' },
  { code: 'KHI', city: 'Karachi', country: 'Pakistan', name: 'Jinnah International' },
  { code: 'LHE', city: 'Lahore', country: 'Pakistan', name: 'Allama Iqbal International' },
  
  // Asia - Taiwan
  { code: 'TPE', city: 'Taipei', country: 'Taiwan', name: 'Taiwan Taoyuan International' },
  { code: 'TSA', city: 'Taipei', country: 'Taiwan', name: 'Taipei Songshan' },
  { code: 'KHH', city: 'Kaohsiung', country: 'Taiwan', name: 'Kaohsiung International' },
  
  // Oceania
  { code: 'SYD', city: 'Sydney', country: 'Australia', name: 'Sydney Kingsford Smith' },
  { code: 'MEL', city: 'Melbourne', country: 'Australia', name: 'Melbourne Airport' },
  { code: 'BNE', city: 'Brisbane', country: 'Australia', name: 'Brisbane Airport' },
  { code: 'PER', city: 'Perth', country: 'Australia', name: 'Perth Airport' },
  { code: 'ADL', city: 'Adelaide', country: 'Australia', name: 'Adelaide Airport' },
  { code: 'CNS', city: 'Cairns', country: 'Australia', name: 'Cairns Airport' },
  { code: 'OOL', city: 'Gold Coast', country: 'Australia', name: 'Gold Coast Airport' },
  { code: 'AKL', city: 'Auckland', country: 'New Zealand', name: 'Auckland Airport' },
  { code: 'CHC', city: 'Christchurch', country: 'New Zealand', name: 'Christchurch International' },
  { code: 'WLG', city: 'Wellington', country: 'New Zealand', name: 'Wellington International' },
  { code: 'ZQN', city: 'Queenstown', country: 'New Zealand', name: 'Queenstown Airport' },
  { code: 'NAN', city: 'Nadi', country: 'Fiji', name: 'Nadi International' },
  { code: 'PPT', city: 'Papeete', country: 'French Polynesia', name: 'Faa\'a International' },
  
  // South America
  { code: 'GRU', city: 'São Paulo', country: 'Brazil', name: 'São Paulo/Guarulhos International' },
  { code: 'GIG', city: 'Rio de Janeiro', country: 'Brazil', name: 'Rio de Janeiro/Galeão International' },
  { code: 'BSB', city: 'Brasília', country: 'Brazil', name: 'Brasília International' },
  { code: 'CGH', city: 'São Paulo', country: 'Brazil', name: 'Congonhas Airport' },
  { code: 'EZE', city: 'Buenos Aires', country: 'Argentina', name: 'Ministro Pistarini International' },
  { code: 'AEP', city: 'Buenos Aires', country: 'Argentina', name: 'Jorge Newbery Airpark' },
  { code: 'BOG', city: 'Bogotá', country: 'Colombia', name: 'El Dorado International' },
  { code: 'MDE', city: 'Medellín', country: 'Colombia', name: 'José María Córdova International' },
  { code: 'CTG', city: 'Cartagena', country: 'Colombia', name: 'Rafael Núñez International' },
  { code: 'LIM', city: 'Lima', country: 'Peru', name: 'Jorge Chávez International' },
  { code: 'CUZ', city: 'Cusco', country: 'Peru', name: 'Alejandro Velasco Astete International' },
  { code: 'SCL', city: 'Santiago', country: 'Chile', name: 'Arturo Merino Benítez International' },
  { code: 'UIO', city: 'Quito', country: 'Ecuador', name: 'Mariscal Sucre International' },
  { code: 'GYE', city: 'Guayaquil', country: 'Ecuador', name: 'José Joaquín de Olmedo International' },
  { code: 'MVD', city: 'Montevideo', country: 'Uruguay', name: 'Carrasco International' },
  { code: 'ASU', city: 'Asunción', country: 'Paraguay', name: 'Silvio Pettirossi International' },
  { code: 'VVI', city: 'Santa Cruz', country: 'Bolivia', name: 'Viru Viru International' },
  { code: 'CCS', city: 'Caracas', country: 'Venezuela', name: 'Simón Bolívar International' },
  
  // Central America
  { code: 'PTY', city: 'Panama City', country: 'Panama', name: 'Tocumen International' },
  { code: 'SJO', city: 'San José', country: 'Costa Rica', name: 'Juan Santamaría International' },
  { code: 'LIR', city: 'Liberia', country: 'Costa Rica', name: 'Daniel Oduber Quirós International' },
  { code: 'GUA', city: 'Guatemala City', country: 'Guatemala', name: 'La Aurora International' },
  { code: 'SAL', city: 'San Salvador', country: 'El Salvador', name: 'Monseñor Óscar Arnulfo Romero International' },
  { code: 'MGA', city: 'Managua', country: 'Nicaragua', name: 'Augusto C. Sandino International' },
  { code: 'TGU', city: 'Tegucigalpa', country: 'Honduras', name: 'Toncontín International' },
  { code: 'BZE', city: 'Belize City', country: 'Belize', name: 'Philip S. W. Goldson International' },
]

export function searchAirports(query: string): Airport[] {
  if (!query || query.length < 2) return []
  
  const searchTerm = query.toLowerCase().trim()
  
  // Score each airport based on match quality
  const scoredResults = MAJOR_AIRPORTS.map(airport => {
    const code = airport.code.toLowerCase()
    const city = airport.city.toLowerCase()
    const country = airport.country.toLowerCase()
    const name = airport.name.toLowerCase()
    
    let score = 0
    
    // Exact matches get highest priority
    if (code === searchTerm) score += 1000
    if (city === searchTerm) score += 900
    if (country === searchTerm) score += 800
    
    // Starts with matches get high priority
    if (code.startsWith(searchTerm)) score += 500
    if (city.startsWith(searchTerm)) score += 400
    if (country.startsWith(searchTerm)) score += 300
    
    // Contains matches get lower priority
    if (code.includes(searchTerm)) score += 100
    if (city.includes(searchTerm)) score += 80
    if (country.includes(searchTerm)) score += 60
    if (name.includes(searchTerm)) score += 40
    
    return { airport, score }
  })
  
  // Filter out non-matches and sort by score (descending)
  return scoredResults
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8) // Limit to 8 results for better UX
    .map(result => result.airport)
}

export function formatAirportDisplay(airport: Airport): string {
  return `${airport.city} (${airport.code}) - ${airport.country}`
}
