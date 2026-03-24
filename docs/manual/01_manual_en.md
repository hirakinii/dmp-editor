# DMP Editor User Manual

## Table of Contents
1. [Introduction](#1-introduction)
2. [Preparation: Obtaining a GRDM Token](#2-preparation-obtaining-a-grdm-token)
3. [Login (Authentication)](#3-login-authentication)
4. [Operations on the Project List Screen](#4-operations-on-the-project-list-screen)
5. [Creating and Editing a DMP](#5-creating-and-editing-a-dmp)
   - [Step 1: DMP Metadata](#step-1-dmp-metadata)
   - [Step 2: Project Information](#step-2-project-information)
   - [Step 3: Personnel Information](#step-3-personnel-information)
   - [Step 4: Research Data Information](#step-4-research-data-information)
   - [Step 5: GRDM Integration](#step-5-grdm-integration)
   - [Save](#save)
6. [DMP Output (Export)](#6-dmp-output-export)

---

## 1. Introduction

This manual summarizes the operation procedures for the "DMP Editor", a tool that supports the creation of Data Management Plans (DMPs) required by funding agencies.

Since this system operates in integration with GakuNin RDM (GRDM), a GRDM account and access token are required to use it.

**Main Features of DMP Editor:**

| Feature | Description |
|------|------|
| Create and Edit DMPs | Input and manage DMPs in a 5-step format. |
| KAKEN Autocomplete | Automatically retrieve project and researcher information by entering a KAKEN grant number. |
| ROR Organization Search | Search for a data management organization by name and automatically set the ROR ID. |
| GRDM User Search | Search for registered GRDM users by last name and automatically import personnel information. |
| GRDM File Integration | Link actual data files on GRDM to DMP data items. |
| Excel Export | Export in general-purpose Excel format or JSPS format Excel format. |

---

## 2. Preparation: Obtaining a GRDM Token

If you do not have the token required for login, please issue it using the following steps.

1. **Accessing the Settings Screen**
   Access the GakuNin RDM token settings page (`https://rdm.nii.ac.jp/settings/tokens`) using your web browser.
2. **Creating a New Token**
   Select "New token" on the "Personal access tokens" screen.
3. **Entering Token Information**
   - **Token Name**: Enter any name (e.g., `dmp-editor`).
   - **Scopes (Permissions)**: **Make sure to check `osf.full_write`**.
     - * Note: If the `osf.full_write` permission is not granted, integration will not work correctly.
4. **Completing Creation**
   Click the "Create" button to generate the token, and copy the displayed token string to keep it safe.

---

## 3. Login (Authentication)

1. **Accessing the DMP Editor Top Page**
   Open the DMP Editor and display the "Connect with GRDM" screen.
2. **Entering the Token**
   Paste the obtained token into the "GRDM Token" input field.
3. **Executing Authentication**
   Click the "Authenticate" button. The entered token is saved only in the browser's local storage and is used solely for communication with GRDM. It is not sent to the server.

Upon successful authentication, the logged-in user's name and affiliated organization will be displayed in the header, and you will be redirected to the project list screen.

---

## 4. Operations on the Project List Screen

After logging in, the "DMP Project List" is displayed.

| Operation | Description |
|------|------|
| **View List** | You can check the names, creation dates, and last updated dates of created DMP projects. |
| **Create New** | Click the "Create New DMP Project" button to create a new DMP. |
| **Edit** | Click the "Edit" button in each row to open the DMP editing screen. |
| **View Details** | Click the "Details" button in each row to view the contents of the DMP in read-only mode. |
| **GRDM Link** | You can directly access the corresponding project page on GRDM from the link in each row. |

---

## 5. Creating and Editing a DMP

The "DMP Project Edit" screen consists of **5 steps**. Move through each step by clicking the step bar at the top of the screen or using the "Next" and "Back" buttons. You cannot proceed to the next step if mandatory fields in each step are not filled out.

Input data is retained across steps. After editing, save it to GRDM using the "Save" button at the bottom.

> **How to Read the Tables**: ✅ = Mandatory, — = Optional

---

### Step 1: DMP Metadata

Enter basic information related to the entire DMP.

| Field | Description | Planning | In Progress | Reporting |
|-----------|------|:---:|:---:|:---:|
| Type | Select from New / Revision / Update | ✅ | ✅ | ✅ |
| Submission Date | The scheduled date to submit the DMP to the funding agency | ✅ | ✅ | ✅ |
| Research Phase | Select from Planning / In Progress / Reporting | ✅ | ✅ | ✅ |
| DMP Creation Date | Automatically set when created (cannot be changed) | — | — | — |
| Last Updated Date | Automatically updated when saved (cannot be changed) | — | — | — |

> **Hint**: Depending on the selected research phase, the mandatory/optional status of some fields in Step 4 (Research Data Information) changes. Refer to the tables in Step 4 for details.

---

### Step 2: Project Information

Enter basic information about the research project.

| Field | Description | Planning | In Progress | Reporting |
|-----------|------|:---:|:---:|:---:|
| Funding Agency | Name of the agency providing funds for the project | ✅ | ✅ | ✅ |
| Program Name | Name of the public call program (refer to NISTEP) | — | — | — |
| Program Code | Classification code of the program (refer to NISTEP) | — | — | — |
| Systematic Number | 15-digit systematic number | ✅ | ✅ | ✅ |
| Project Name | Name of the research project | ✅ | ✅ | ✅ |
| Adoption Year | Year the research was adopted | — | — | — |
| Start Year | Start year of the research | — | — | — |
| End Year | End year of the research | — | — | — |

#### Autocomplete by KAKEN Number

If you enter a KAKEN grant number (e.g., `23K12345`) in the input field and search, the following information will be automatically retrieved from the KAKEN API and reflected in the form:

- Funding Agency, Program Name, Program Code
- Adoption Year, Start Year, End Year
- Information of Principal Investigator and Co-Investigators (reflected in Step 3)

The retrieved results will be displayed in the **Confirmation Dialog (KakenConfirmDialog)**. The dialog shows the program name, project name, adoption year, and a list of retrieved researchers. Please check the contents and click "Apply".

If a person in charge is already registered in Step 3, a **Duplicate Person Dialog (DuplicatePersonDialog)** will be displayed to prevent duplicate registration of personnel with the same first and last name and affiliation. You can choose to skip duplicate personnel individually.

---

### Step 3: Personnel Information

You can register multiple personnel involved in the DMP. Click the "Add Personnel" button to expand the input form and enter the information. Registered personnel can be reordered using drag operations.

| Field | Description | Planning | In Progress | Reporting |
|-----------|------|:---:|:---:|:---:|
| Role | Select from Principal Investigator / Co-Investigator / Creator of Managed Data / Manager of Managed Data (multiple selections allowed) | ✅ | ✅ | ✅ |
| Last Name | Last name of the person | ✅ | ✅ | ✅ |
| First Name | First name of the person | ✅ | ✅ | ✅ |
| Affiliation | Name of the affiliated organization of the person | ✅ | ✅ | ✅ |
| e-Rad Researcher Number | Researcher ID for the Cross-Ministerial R&D Management System | — | — | — |
| ORCID | International researcher identifier | — | — | — |
| Contact (Email Address) | Email address of the person | — | — | — |
| GRDM User ID | Identifier for linking with a GRDM account (automatically set during GRDM search) | — | — | — |

> **Constraints**: Only one "Principal Investigator" and one "Manager of Managed Data" can be registered respectively. Also, duplicate registration of personnel with the same first and last name and affiliation is not allowed.

#### GRDM User Search

By expanding the "Search GRDM Users" panel, you can search for users registered in GRDM by their **last name**. When you select from the candidates, the name, affiliated organization, ORCID, e-Rad number, and GRDM User ID are automatically entered.

#### Value Source Display

Each personnel record displays a chip indicating the source of the information:
- **KAKEN**: Value automatically retrieved from the KAKEN API
- **GRDM**: Value retrieved from the GRDM user search
- (No chip): Value manually entered by the user

---

### Step 4: Research Data Information

You can register multiple managed datasets. Click the "Add Dataset" button to expand the input form and enter the information.

#### Basic Information

| Field | Description | Planning | In Progress | Reporting |
|-----------|------|:---:|:---:|:---:|
| Name of Managed Data | Identifier name of the dataset | ✅ | ✅ | ✅ |
| Publication/Update Date | Public publication or update date of the dataset | — | ✅ | ✅ |
| Data Description | Content/overview of the data | ✅ | ✅ | ✅ |
| Data Field | Select from 11 fields (Life Science, ICT, Environment, Nanotechnology, etc.) | ✅ | ✅ | ✅ |
| Data Type | Select from 14 types (Experimental Data, Observation Data, Numerical Data, etc.) | ✅ | ✅ | ✅ |
| Approximate Data Volume | Estimated size of the data | — | — | — |
| Acquisition/Collection Method | Description of how the data was acquired or collected | — | — | — |
| Reuse Information | Information for when other researchers reuse the data | — | — | — |

#### Security and Ethics Policy

| Field | Description | Planning | In Progress | Reporting |
|-----------|------|:---:|:---:|:---:|
| Presence of Sensitive Info | Whether personal/confidential information is included (Yes / No) | — | — | — |
| Handling Policy for Sensitive Info | Management policy if sensitive information is present | — | — | — |
| Utilization/Provision Policy (During Research) | Data access and usage policy during the research period | ✅ | ✅ | ✅ |

#### Preservation and Publication Plan

| Field | Description | Planning | In Progress | Reporting |
|-----------|------|:---:|:---:|:---:|
| Repository Information (During Research) | Data storage location during the research period | ✅ | ✅ | ✅ |
| Backup Location | Information about the backup destination | — | — | — |
| Access Rights | Select from Public / Shared / Non-shared / Deferred Publication | ✅ | ✅ | ✅ |
| Scheduled Publication Date | Scheduled date to publish the data (Always mandatory if Access Rights is "Deferred Publication") | — | — | ✅ |
| Publication/Provision Policy Details | Detailed description of publication conditions | — | — | — |
| Repository Information (After Research) | Storage location after research ends (Repository URL/DOI) | — | — | ✅ |

#### Management System

| Field | Description | Planning | In Progress | Reporting |
|-----------|------|:---:|:---:|:---:|
| Data Management Organization | Name of the organization managing the data (Supports ROR search) | ✅ | ✅ | ✅ |
| Data Management Organization Code (ROR ID) | International organization identifier automatically set by ROR search | — | — | — |
| Data Manager | Name of the department in charge of management, etc. | ✅ | ✅ | ✅ |
| Data Manager Contact | Contact information for the management entity (organizational contact is recommended) | ✅ | ✅ | ✅ |
| Creator of Managed Data | Select from the drop-down of personnel registered in Step 3 | — | — | — |
| Research Data Storage Location (After Research) | Information about long-term storage destination | — | — | — |
| Research Data Preservation Period (After Research) | Information about long-term preservation period | — | — | — |

#### ROR Organization Search

By clicking the search icon next to the "Data Management Organization" field, you can search for organization names using the ROR (Research Organization Registry) API. Selecting an organization from the search results will automatically enter the organization name and ROR ID.

- Supports searching with Japanese keywords.
- Candidates are displayed when 2 or more characters are entered (300ms debounce).

#### Linking GRDM Files

By clicking the "**Select GRDM File**" button inside each dataset editing form, the file tree of the GRDM project associated in Step 5 will be displayed. By selecting files to link from here, you can tie the dataset definition to actual files.

- If you select a folder, all files within that folder will be linked at once.
- You can select multiple files.

After linking, by clicking the "**Compare GRDM Metadata**" button, you can compare the metadata (name, field, type, access rights, etc.) on GRDM of the linked files side-by-side with the current input values. You can select and import values from the GRDM side. The "GRDM" source chip will be displayed for the imported fields.

---

### Step 5: GRDM Integration

Associate a GRDM project containing actual data with the DMP project, and map files to DMP data items.

#### Associating a GRDM Project

Select a GRDM project to associate from the pull-down menu. You can associate multiple projects.

#### Browsing the File Tree and Mapping

The file/folder structure of the associated GRDM project is displayed in a tree format. For each dataset (registered in Step 4), you can link the corresponding GRDM files.

For linked files, the following metadata is automatically recorded in the DMP data:
- File name, full path, size
- MD5 / SHA256 hash values
- Creation date, update date, last access date
- GRDM page URL

> **Hint**: You can also select files and compare them with GRDM metadata from each dataset editing form in Step 4 (Research Data Information).

---

### Save

Click the "**Save**" button at the bottom of the screen to save your edits to GRDM. A toast notification will be displayed upon successful save.

> **Caution**: If you attempt to leave the page with unsaved changes in the form, a confirmation dialog will appear. To prevent unintended data loss, always execute "Save" before leaving the page.

---

## 6. DMP Output (Export)

You can output the created DMP as an Excel file. Click the "**Export**" button in each row on the project list screen, or the "**Export**" button on the DMP detail view screen.

### General-Purpose Excel Format (.xlsx)

Exports all DMP fields expanded across the following 4 sheets. It is suitable for cross-organizational recording, sharing, and backup purposes.

| Sheet | Content |
|--------|------|
| DMP Information | Type, Submission Date, Creation Date, Update Date |
| Project Information | Funding Agency, Program Name, Systematic Number, Research Period, etc. |
| Personnel Information | Role, Name, Affiliation, Identifiers, etc. |
| Research Data Information | Detailed fields of all datasets |

### JSPS Format Excel Format (.xlsx)

Embeds DMP data into the DMP submission format template of the Japan Society for the Promotion of Science (JSPS) and outputs it as a ready-to-submit Excel file.

- If the number of personnel or data items exceeds the default number of rows in the format, rows are automatically added.
- Cell formatting (colors, fonts, etc.) is preserved.
