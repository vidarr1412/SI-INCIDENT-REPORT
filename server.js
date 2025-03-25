require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose"); 
const cors = require("cors");
const bcrypt = require("bcrypt");
const User = require("./src/models/User");
const Item = require('./src/models/Item'); // Import the Item model
const jwt = require('jsonwebtoken');
const Complaint = require('./src/models/Complaint'); // Import the Complaint model
const RetrievalRequestSchema =require('./src/models/RetrievalRequest');
const axios = require("axios"); // Ensure axios is installed
const app = express();
const PORT =  5000;
const MONGO_URI = process.env.MONGO_URI;
const SECRET_KEY = process.env.SECRET_KEY;
const SHEETBEST_URL = process.env.SHEETBEST_URL;
const FoundationSchema = require('./src/models/Foundation');
// Middleware
app.use(cors());
app.use(express.json());

mongoose
.connect(MONGO_URI)
.then(() => {
  console.log('Connected to MongoDB!');
})
  .then(() => console.log("MongoDB connected"))
  .catch((error) => console.error("MongoDB connection error:", error));
// Routes


const updateItemStatuses = async () => {
  try {
    const items = await Item.find({ STATUS: "unclaimed" }); // Get only unclaimed items
    const foundations = await FoundationSchema.find();

    for (const item of items) {
      const itemDate = new Date(item.DATE_FOUND);
      let matchedFoundationId = null;

      console.log(`Checking unclaimed item ${item._id}: DATE_FOUND = ${item.DATE_FOUND}`);

      for (const foundation of foundations) {
        const startDate = new Date(foundation.foundation_start_date);
        const endDate = new Date(foundation.foundation_end_date);
// Validate that startDate does not exceed endDate if (startDate > endDate) { console.error(❌ Invalid foundation dates for foundation ${foundation._id}: start date ${foundation.foundation_start_date} exceeds end date ${foundation.foundation_end_date}); continue; // Skip this foundation }
if(startDate>endDate) {
  continue;
}      
if (itemDate >= startDate && itemDate <= endDate) {
          matchedFoundationId = foundation._id;
          console.log(`  ✅ Match found! Assigning foundation_id ${foundation._id} and updating STATUS to "donated"`);
          break; // Stop at the first matching foundation
        }
      }

      // Update only if foundation_id changed
      if (matchedFoundationId && item.foundation_id?.toString() !== matchedFoundationId?.toString()) {
        console.log(`  🔄 Updating item ${item._id}: foundation_id = ${matchedFoundationId}, STATUS = "donated"`);
        await Item.findByIdAndUpdate(item._id, {
          foundation_id: matchedFoundationId,
          STATUS: "donated"
        });
      } else {
        console.log(`  ⏩ No change for item ${item._id}`);
      }
    }

    console.log("✅ Unclaimed items updated successfully.");
  } catch (error) {
    console.error("❌ Error updating item statuses:", error);
  }
};



//--------------------signing upppp----------------------------------------
app.post("/signup", async (req, res) => {
  const { firstName,lastName, email, password,usertype,contactNumber,college,year_lvl, } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ firstName,lastName,contactNumber, email, password: hashedPassword ,usertype: "student",college,year_lvl,});

    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error saving user to MongoDB:", error);
    res.status(500).json({ error: "Error registering user" });
  }
});
app.get("/profile/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Error fetching profile" });
  }
});

// Update user profile (first name, last name, email)
app.put("/update-profile/:userId", async (req, res) => {
  const { userId } = req.params;
  const { firstName, lastName, email, password ,contactNumber,image_Url,college,year_lvl} = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user fields
    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;
    user.image_Url=image_Url;
    user.contactNumber = contactNumber;
    user.college = college;
    user.year_lvl = year_lvl;
    // If password is provided, hash it before saving
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    await user.save(); // Save updated user data

    res.status(200).json({ message: "Profile updated successfully!" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
});
//----------------------------------login ----------------------------------------------------
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate user credentials (replace with your logic)
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Generate JWT
  const token = jwt.sign({ id: user._id,
     email: user.email,
     college:user.college,
     contactNumber:user.contactNumber,
     usertype:user.usertype,
     firstName:user.firstName,
     lastName:user.lastName,
     year_lvl:user.year_lvl, }, SECRET_KEY, {
    expiresIn: '1h', // Token expiration time
  });

  res.json({ token });
});

//-----------------------------------creating complaints------------------------------------------
app.post("/complaints", async (req, res) => {
  const { complainer ,
college ,
year_lvl,
itemname ,
type ,
description ,
contact ,
general_location ,
location ,
time ,
date,
date_complained, 
time_complained,
status,
duration,
 } = req.body;

  try {   
    const newComplaint = new Complaint({
complainer ,
college ,
year_lvl,
itemname ,
type ,
description ,
contact ,
general_location ,
location ,
time ,
date,
date_complained, 
time_complained, 
status,
finder: "N/A",
duration,
    });

    await newComplaint.save();
    res.status(201).json({ message: "Complaint filed successfully" });
  } catch (error) {
    console.error("Error saving complaint to MongoDB:", error);
    res.status(500).json({ error: "Error filing complaint" });
  }
});
// -----------------------------------------print complaints-----------------------------------------
app.get("/complaints", async (req, res) => {
  try {
    const complaints = await Complaint.find();
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ------------------------------------updating complaints------------------------------------------------------------
app.put("/complaints/:id", async (req, res) => {
  const { id } = req.params;
  const {complainer ,
    college ,
    year_lvl,
    itemname ,
    type ,
    description ,
    contact ,
    general_location ,
    location ,
    time ,
    date,
    date_complained, 
    time_complained, 
    status ,
    finder,item_image } = req.body;

  try {
    // Find the complaint by ID
    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }
    complaint.complainer = complainer || complaint.complainer;
    complaint.college=college||complaint.college ;
    complaint.year_lvl=year_lvl||complaint.year_lvl;
    complaint.itemname =itemname||complaint.itemname;
    complaint.type  = type||complaint.type;
    complaint.description = description||complaint.description;
    complaint.contact = contact||complaint.contact;
    complaint.general_location = general_location||complaint.general_location,
    complaint.location = location||complaint.location;
    complaint.time = time||complaint.time;
    complaint.date=date||complaint.date;
    complaint.date_complained = date_complained||complaint.date_complained; 
    complaint.time_complained = time_complained||complaint.time_complained; 
    complaint.status = status||complaint.status ;
    complaint.finder = finder ||complaint.finder ;
    complaint.item_image = item_image||complaint.item_image;
    //  para masave ang updated complaint
    await complaint.save();

    // Return a response with the updated complaint
    res.json({ message: "Complaint updated successfully", complaint });
  } catch (error) {
    // Handle any errors during the update process
    res.status(500).json({ message: error.message });
  }
});


//-------------------deleting complaints----------------------------------------------

app.delete("/complaints/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Find and delete the complaint by its ID
    const deletedComplaint = await Complaint.findByIdAndDelete(id);

    if (!deletedComplaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    res.status(200).json({ message: "Complaint deleted successfully", deletedComplaint });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete complaint" });
  }
});


app.post("/items", async (req, res) => {
  let {
    FINDER,
    FINDER_TYPE,
    ITEM,
    ITEM_TYPE,
    DESCRIPTION,
    IMAGE_URL,
    CONTACT_OF_THE_FINDER,
    DATE_FOUND,
    GENERAL_LOCATION,
    FOUND_LOCATION,
    TIME_RETURNED,
    OWNER,
    OWNER_COLLEGE,
    OWNER_CONTACT,
    OWNER_IMAGE,
    DATE_CLAIMED,
    TIME_CLAIMED,
    STATUS,
    foundation_id,
    POST_ID,
    DURATION,  // ⬅️ New field to store duration
  } = req.body;

  // Ensure foundation_id is null if empty
  if (!foundation_id) {
    foundation_id = null;
  }

  try {
    // Step 1: Save to MongoDB with DURATION
    const newItem = new Item({
      FINDER,
      FINDER_TYPE,
      ITEM,
      ITEM_TYPE,
      DESCRIPTION,
      IMAGE_URL,
      CONTACT_OF_THE_FINDER,
      DATE_FOUND,
      GENERAL_LOCATION,
      FOUND_LOCATION,
      TIME_RETURNED,
      OWNER,
      OWNER_COLLEGE,
      OWNER_CONTACT,
      OWNER_IMAGE,
      DATE_CLAIMED,
      TIME_CLAIMED,
      STATUS,
      foundation_id,
      POST_ID,
      DURATION,  // ⬅️ Saving duration here
    });

    await newItem.save();
    await updateItemStatuses();

    // Step 2: Fetch foundation_name if foundation_id exists
    let foundationName = "";
    if (foundation_id) {
      const foundation = await FoundationSchema.findById(foundation_id);
      if (foundation) {
        foundationName = foundation.foundation_name;
      }
    }

    // Step 3: Save to Google Sheets with foundation_name only
    const sheetResponse = await axios.post(SHEETBEST_URL, [
      {
        FINDER,
        FINDER_TYPE,
        ITEM,
        ITEM_TYPE,
        DESCRIPTION,
        IMAGE_URL,
        CONTACT_OF_THE_FINDER,
        DATE_FOUND,
        GENERAL_LOCATION,
        FOUND_LOCATION,
        TIME_RETURNED,
        OWNER,
        OWNER_COLLEGE,
        OWNER_CONTACT,
        OWNER_IMAGE,
        DATE_CLAIMED,
        TIME_CLAIMED,
        STATUS,
        POST_ID: `www.facebook.com/${POST_ID}`, // Modify POST_ID here
        foundation_id: foundationName, // Only foundation_name, not the _id
        DURATION,  // ⬅️ Saving duration in Google Sheets
      },
    ]);

    // Step 4: Respond with success message
    res.status(201).json({
      message: "Item added successfully",
      item: newItem,
      sheetResponse: sheetResponse.data,
    });
  } catch (error) {
    console.error("Error adding item:", error);
    res.status(500).json({ message: "Error adding item", error });
  }
});

//---------------------------------------adding found items for user database to be able to display--------------------
app.post('/useritems', async (req, res) => {
  const {    FINDER,//based  on their csv
    FINDER_TYPE,//for data visualization 
    ITEM,//item name ,based on their csv
    ITEM_TYPE,//for data visualization
    DESCRIPTION,//item description ,base on their csv
    IMAGE_URL,//change to item image later
    CONTACT_OF_THE_FINDER,//based on their csv
    DATE_FOUND,//based on their csv
    GENERAL_LOCATION,//for data visualization
    FOUND_LOCATION,//based on their csv
    TIME_RETURNED,  //time received
    OWNER,
    OWNER_COLLEGE,
    OWNER_CONTACT,
    OWNER_IMAGE,
    DATE_CLAIMED,
    TIME_CLAIMED,
    STATUS,
    foundation_id,
  } = req.body;

  try {
    
    // Create a new Item object
    const newItem = new Item({
         FINDER,//based  on their csv
        FINDER_TYPE,//for data visualization y
        ITEM,//item name ,based on their csv
        ITEM_TYPE,//for data visualization
        DESCRIPTION,//item description ,base on their csv
        IMAGE_URL,//change to item image later
        CONTACT_OF_THE_FINDER,//based on their csv
        DATE_FOUND,//based on their csv
        GENERAL_LOCATION,//for data visualization
        FOUND_LOCATION,//based on their csv
        TIME_RETURNED,  //time received
        OWNER,
        OWNER_COLLEGE,
        OWNER_CONTACT,
        OWNER_IMAGE,
        DATE_CLAIMED,
        TIME_CLAIMED,
        STATUS,foundation_id
    });

    // Save the new item to the database
    await newItem.save();

    // Respond with the created item
    res.status(201).json({ message: 'Item added successfully', item: newItem });
  } catch (error) {
    console.error('Error adding item to MongoDB:', error);
    res.status(500).json({ message: 'Error adding item', error });
  }
});

//-----------------------------------printing found items for admin user----------------------------------
app.get('/update-items-status', async (req, res) => {
  await updateItemStatuses();
  res.json({ message: "Item statuses updated successfully" });
});
app.get('/items', async (req, res) => {
  try {
 

    const items = await Item.find().populate("foundation_id", "foundation_name"); 
    await updateItemStatuses();
    res.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ message: "Error fetching items", error });
  }

});

//--------------------------------specific printing for found items in retrieval for admin user---------------------------
app.get('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    // Convert itemId to ObjectId if needed
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid item ID format" });
    }

    const item = await Item.findById(itemId); // Query using `_id`

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});
//------------------------------------updating status--------------------------------------------------------------------------------
app.put('/items/:itemId/status', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status } = req.body;

    if (!["claimed", "unclaimed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const updatedItem = await Item.findByIdAndUpdate(itemId, { STATUS: status }, { new: true });

    if (!updatedItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item status updated", updatedItem });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

//-----------------printing found items for student users------------------------------
app.get('/useritems', async (req, res) => {
  try {
    // Fetch items with status 'unclaimed'
    const items = await Item.find({
      STATUS: { $regex: 'unclaimed', $options: 'i' }  // Case-insensitive match for 'unclaimed'
    });
    console.log("Fetched Items:", items);  // Log the fetched items to the console

    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Error fetching items', error });
  }
});

//-----------------------------updating found items for admin user------------------------------------
app.put("/items/:id", async (req, res) => {
  try {
    // Step 1: Update in MongoDB
    const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedItem) return res.status(404).json({ error: "Item not found" });

    // Step 2: Update in Google Sheets
    const sheetResponse = await axios.put(`${SHEETBEST_URL}/FINDER/${updatedItem.FINDER}`, req.body);

    // Step 3: Respond with updated item
    res.status(200).json({
      message: "Item updated successfully",
      updatedItem,
      sheetResponse: sheetResponse.data,
    });
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ error: "Failed to update item" });
  }
});

// -----------------------------------deleting found items for admin user------------------------------------

app.delete("/items/:id", async (req, res) => {
  try {
    // Step 1: Find and delete the item in MongoDB
    const deletedItem = await Item.findByIdAndDelete(req.params.id);
    if (!deletedItem) return res.status(404).json({ error: "Item not found" });

    // Step 2: Delete from Google Sheets based on FINDER
    await axios.delete(`${SHEETBEST_URL}/FINDER/${deletedItem.FINDER}`);

    // Step 3: Respond with success message
    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ error: "Failed to delete item" });
  }
});



//--------------------adding complaints for student users-----------------------------------
app.post("/usercomplaints", async (req, res) => {
  const {  complainer ,
    college ,
    year_lvl,
    itemname ,
    type ,
    description ,
    contact ,
    general_location ,
    location ,
    time ,
    date,
    date_complained, 
    time_complained, 
     userId,
    item_image,status } = req.body;

  try {
    const newComplaint = new Complaint({
      complainer ,
      college ,
      year_lvl,
      itemname ,
      type ,
      description ,
      contact ,
      general_location ,
      location ,
      date,
      time ,
      date_complained, 
      time_complained, 
      status,
      finder: "N/A",
      userId, // Add userId here
      item_image,
          });

    await newComplaint.save();
    res.status(201).json({ message: "Complaint filed successfully" });
  } catch (error) {
    console.error("Error saving complaint to MongoDB:", error);
    res.status(500).json({ error: "Error filing complaint" });
  }
});

//------------------------------delete complaints for student userss------------------------------
app.delete("/usercomplaints/:id", async (req, res) => {
  const complaintId = req.params.id;

  try {
    // Attempt to find and delete the complaint by its ID
    const deletedComplaint = await Complaint.findByIdAndDelete(complaintId);

    if (!deletedComplaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    res.status(200).json({ message: "Complaint deleted successfully" });
  } catch (error) {
    console.error("Error deleting complaint:", error);
    res.status(500).json({ error: "Error deleting complaint" });
  }
});

//------------------------------updating complaints for student users-----------------------------------
app.put("/usercomplaints/:id", async (req, res) => {
  const complaintId = req.params.id;
  const {  complainer ,
    college ,
    year_lvl,
    itemname ,
    type ,
    description ,
    contact ,
    general_location ,
    location ,
    time ,
    date,
    date_complained, 
    time_complained, userId,item_image ,status} = req.body;

  try {
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      complaintId, 
      {
       
        complainer ,
        college ,
        year_lvl,
        itemname ,
        type ,
        description ,
        contact ,
        general_location ,
        location ,
        time ,
        date,
        date_complained, 
        time_complained, 
        userId, // userId is updated as well
        status,
        finder: "N/A", // Default finder value, this can also be updated
        item_image,
      },
      { new: true } // This option ensures the updated document is returned
    );

    if (!updatedComplaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    res.status(200).json({ message: "Complaint updated successfully", complaint: updatedComplaint });
  } catch (error) {
    console.error("Error updating complaint:", error);
    res.status(500).json({ error: "Error updating complaint" });
  }
});
//-----------------------printing complaints for student users------------------------------------------------------------------------
app.get("/usercomplaints/:id", async (req, res) => {
  try {
    // Use the userId from the URL parameter to find the specific complaints
    const complaints = await Complaint.find({ userId: req.params.id });

    // Return the complaints in the response
    res.json(complaints);
  } catch (error) {
    // If an error occurs, send a 500 status with the error message
    res.status(500).json({ message: error.message });
  }
});

//----------------------------------------------user requesting for retrieval------------------------------------------------------------------------------
app.post('/retrieval-request', async (req, res) => {
  const { claimer_name,
    claimer_college,
    claimer_lvl, 
    contactNumber,
    date_complained,
    time_complained,
    item_name, 
    description,
    general_location,
    specific_location,
    date_Lost,
    time_Lost, 
    id, 
    owner_image,
    itemId, 
    userId,status,
    
  } = req.body;

  try {
    // Create a new retrieval request with the userId included
    const newRequest = new RetrievalRequestSchema({
      claimer_name,
      claimer_college,
      claimer_lvl,
      contactNumber,
      date_complained,
      time_complained,
      item_name,
      description,
      general_location,
      specific_location,
      date_Lost,
      time_Lost,
      id,
      owner_image,
      itemId,
      userId,
      status:"pending",
    });

    await newRequest.save();

    // Respond back with the saved request
    res.status(201).json({
      message: 'Retrieval request successfully saved.',
      request: newRequest,
    });
  } catch (error) {
    console.error('Error saving retrieval request:', error);
    res.status(500).json({ message: 'Failed to save request.' });
  }
});
//-----------------------------admin fetching the retrievals---------------------------------------------------------------------

app.get('/retrieval-requests', async (req, res) => {
  try {
    const requests = await RetrievalRequestSchema.find();
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching requests", error });
  }
});
//--------------------------------User fetching specific retrievals---------------------------------------------
app.get("/retrieval-requests/:id", async (req, res) => {
  try {
    const requests= await RetrievalRequestSchema.find({ userId: req.params.id });    
    res.json(requests);
  } catch (error) {
   
    res.status(500).json({ message: error.message });
  }
});
app.get("/user-retrieval-requests", async (req, res) => {
  try {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: "User ID is required" });

      const requests = await RetrievalRequestSchema.find({ userId });
      res.json(requests);
  } catch (error) {
      console.error("Error fetching retrieval requests:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});

//-------------------------------------update retrieval request for admin---------------------//
app.put('/retrieval-request/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Find the request by _id and update the status
    const updatedRequest = await RetrievalRequestSchema.findOneAndUpdate(
      { _id: id },  // FIXED: Correct query
      { status }, 
      { new: true } // Return the updated document
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: 'Retrieval request not found.' });
    }

    res.json({
      message: 'Retrieval request status updated successfully.',
      request: updatedRequest,
    });
  } catch (error) {
    console.error('Error updating retrieval request status:', error);
    res.status(500).json({ message: 'Failed to update status.' });
  }
});


//----------------------------------update item status of the retrieval request-------------------
app.put('/found-item/:itemId/status', async (req, res) => {
  const { itemId } = req.params;
  const { status } = req.body;

  if (!itemId) {
    return res.status(400).json({ message: 'Invalid item ID' });
  }

  console.log(`Updating item with ID: ${itemId}, New Status: ${status}`); // Debugging

  try {
    const updatedItem = await Item.findOneAndUpdate(
      { _id: itemId },  // ✅ Ensure we filter by the correct item
      { $set: { STATUS: status } },  // ✅ Use `$set` to modify only the `STATUS`
      { new: true } // ✅ Return the updated document
    );

    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({
      message: 'Item status updated successfully.',
      item: updatedItem,
    });
  } catch (error) {
    console.error('Error updating item status:', error);
    res.status(500).json({ message: 'Failed to update item status.' });
  }
});//goods

//---------------------------UPDATE USER RETRIEVAL REQUEST USER----------------------------
// Update request (only description and contactNumber)
app.put('/retrieval-requests/:id', async (req, res) => {
  const { description, item_name,general_location,specific_location,date_Lost,time_Lost,owner_image} = req.body;
  try {
    const updatedRequest = await RetrievalRequestSchema.findByIdAndUpdate(
      req.params.id,
      { description, item_name,general_location,specific_location,date_Lost,time_Lost ,owner_image},
      { new: true }
    );
    res.json(updatedRequest);
  } catch (error) {
    res.status(500).json({ message: 'Error updating request' });
  }
});//goods

// -----------------------------------------Delete request
app.delete('/retrieval-requests/:id', async (req, res) => {
  try {
    await RetrievalRequestSchema.findByIdAndDelete(req.params.id);
    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting request' });
  }
});//goods
//-------------------------donation------------------------
app.post("/foundations", async (req, res) => {
  const {
    foundation_name,
    foundation_type,
    foundation_description,
    foundation_link,
    foundation_contact,
    foundation_status,
    foundation_image,
    foundation_end_date,
    foundation_start_date,
  } = req.body;

  try {
    // Step 1: Save to MongoDB
    const newFoundationSchema = new FoundationSchema({
    foundation_name,
    foundation_type,
    foundation_description,
    foundation_link,
    foundation_contact,
    foundation_image,
    foundation_start_date,
    foundation_end_date,
    foundation_status,
    });

    await newFoundationSchema.save();

    // Step 2: Save to Google Sheets (Sheet.best)


    // Step 3: Respond with success message
    res.status(201).json({
      message: "Item added successfully",
      FoundationSchema: newFoundationSchema,
    
    });
  } catch (error) {
    console.error("Error adding item:", error);
    res.status(500).json({ message: "Error adding item", error });
  }
});

app.put("/foundations/:id", async (req, res) => {
  try {
    // Step 1: Update in MongoDB
    const updatedItem = await FoundationSchema.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedItem) return res.status(404).json({ error: "Item not found" });

    // Step 2: Update in Google Sheets
    // const sheetResponse = await axios.put(`${SHEETBEST_URL}/FINDER/${updatedItem.FINDER}`, req.body);

    // Step 3: Respond with updated item
    res.status(200).json({
      message: "Item updated successfully",
      updatedItem,
      // sheetResponse: sheetResponse.data,
    });
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ error: "Failed to update item" });
  }
});

app.get('/foundations', async (req, res) => {
  try {
    const foundation= await FoundationSchema.find();
    res.json(foundation);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Error fetching items', error });
  }
});

app.delete("/foundations/:id", async (req, res) => {
  try {
    // Step 1: Find and delete the item in MongoDB
    const deletedItem = await FoundationSchema.findByIdAndDelete(req.params.id);
    if (!deletedItem) return res.status(404).json({ error: "Item not found" });

    // // Step 2: Delete from Google Sheets based on FINDER
    // await axios.delete(`${SHEETBEST_URL}/FINDER/${deletedItem.FINDER}`);

    // Step 3: Respond with success message
    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ error: "Failed to delete item" });
  }
});
app.put('/foundation/:id', async (req, res) => {
  const { id } = req.params;
  const { foundation_status } = req.body;

  try {
    const updatedFoundation = await FoundationSchema.findByIdAndUpdate(
      id,
      { foundation_status },
      { new: true } // Return the updated document
    );

    if (!updatedFoundation) {
      return res.status(404).json({ message: 'Foundation not found' });
    }

    res.json({ message: 'Foundation status updated', updatedFoundation });
  } catch (error) {
    console.error('Error updating foundation status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get("/items/foundation/:foundationId", async (req, res) => {
  const { foundationId } = req.params;
  console.log("✅ Foundation ID received:", foundationId); // Log incoming ID

  if (!foundationId) {
    console.log("❌ Missing Foundation ID");
    return res.status(400).json({ error: "❌ Foundation ID is required!" });
  }

  try {
    const items = await Item.find({ foundation_id: foundationId }).populate("foundation_id", "foundation_name foundation_contact"); 
    console.log("✅ Items fetched:", items);

    if (!items.length) {
      console.log("❌ No items found!");
      return res.status(404).json({ error: "❌ No items found for this foundation!" });
    }

    res.json(items);
  } catch (error) {
    console.error("❌ Error fetching items:", error);
    res.status(500).json({ error: "❌ Internal Server Error" });
  }
});



app.listen(PORT, () => {
  console.log(`deyamemyidol`);
});
