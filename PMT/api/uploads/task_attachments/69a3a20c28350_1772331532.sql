-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 25, 2026 at 04:13 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `pmt_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_passwords`
--

CREATE TABLE `admin_passwords` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_passwords`
--

INSERT INTO `admin_passwords` (`id`, `admin_id`, `password_hash`, `created_at`, `updated_at`) VALUES
(1, 1, '$2y$10$iDzUunxR7PCn8rR2wjtcYuNmTFawsEGSwjUPxibtsgyzWG5rRdU6G', '2026-02-22 17:48:14', '2026-02-22 18:43:42');

-- --------------------------------------------------------

--
-- Table structure for table `archive_project`
--

CREATE TABLE `archive_project` (
  `ArchiveID` int(11) NOT NULL,
  `ProjectID` int(11) NOT NULL,
  `UserID` int(11) NOT NULL,
  `ProjectName` varchar(100) NOT NULL,
  `Description` text DEFAULT NULL,
  `StartDate` date DEFAULT NULL,
  `EndDate` date DEFAULT NULL,
  `Password` varchar(255) DEFAULT NULL,
  `Status` varchar(50) DEFAULT 'Archived',
  `ArchivedDate` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `comment`
--

CREATE TABLE `comment` (
  `CommentID` int(100) NOT NULL,
  `ProjectID` int(11) DEFAULT NULL,
  `TaskID` int(11) DEFAULT NULL,
  `UserID` int(11) DEFAULT NULL,
  `Content` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `event_logs`
--

CREATE TABLE `event_logs` (
  `EventID` int(11) NOT NULL,
  `UserID` int(11) NOT NULL,
  `Action` varchar(100) NOT NULL,
  `HandledBy` varchar(100) DEFAULT NULL,
  `EventDate` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_logs`
--

INSERT INTO `event_logs` (`EventID`, `UserID`, `Action`, `HandledBy`, `EventDate`) VALUES
(1, 1, 'Edited user account: dora explorer', 'Admin', '2026-02-05 13:36:17'),
(2, 1, 'Edited user account: dora explorer', 'Admin', '2026-02-05 13:36:43'),
(3, 1, 'Edited user account: Dora Explorer', 'Admin', '2026-02-05 13:39:38'),
(4, 1, 'Edited user account: Dora Explorer', 'Admin', '2026-02-05 13:39:44'),
(5, 1, 'Edited user account: Shid Rojas', 'Admin', '2026-02-05 14:01:06'),
(6, 1, 'Edited user account: Tom Jerry', 'Admin', '2026-02-05 14:32:03'),
(7, 1, 'Edited user account: tom jerry', 'Admin', '2026-02-05 14:34:18'),
(8, 1, 'Edited user account: Tom Jerry', 'Admin', '2026-02-05 14:34:48'),
(9, 1, 'Deactivated user account: Tom Jerry', 'Admin', '2026-02-05 15:12:23'),
(10, 1, 'Activated user account: Tom Jerry', 'Admin', '2026-02-05 15:12:28'),
(11, 1, 'Activated user account: Alrashid Rojas', 'Admin', '2026-02-05 15:21:17'),
(12, 1, 'Deactivated user account: Alrashid Rojas', 'Admin', '2026-02-05 15:21:21'),
(13, 1, 'Deactivated user account: Alrashid Rojas', 'Admin', '2026-02-05 15:21:26'),
(14, 1, 'Activated user account: Alrashid Rojas', 'Admin', '2026-02-05 15:26:00'),
(15, 1, 'Activated user account: Alrashid Rojas', 'Admin', '2026-02-05 15:26:02'),
(16, 1, 'Deactivated user account: Tom Jerry', 'Admin', '2026-02-10 07:23:02'),
(17, 1, 'Activated user account: Tom Jerry', 'Admin', '2026-02-10 07:23:29'),
(18, 1, 'Deactivated user account: Tom Jerry', 'Admin', '2026-02-10 08:20:58'),
(19, 1, 'Activated user account: Tom Jerry', 'Admin', '2026-02-10 08:21:02'),
(20, 1, 'Edited user account: Dora The Explorer', 'Admin', '2026-02-20 06:53:33'),
(21, 1, 'Deactivated user account: Alrashid Rojas', 'Admin', '2026-02-20 07:26:47'),
(22, 1, 'Activated user account: Alrashid Rojas', 'Admin', '2026-02-20 14:39:48'),
(23, 1, 'Deactivated user account: Alrashid Rojas', 'Admin', '2026-02-20 15:15:46'),
(24, 1, 'Activated user account: Alrashid Rojas', 'Admin', '2026-02-20 17:24:52'),
(25, 1, 'Deactivated user account: Alrashid Rojas', 'Admin', '2026-02-20 17:25:01'),
(27, 1, 'Activated user account: Alrashid Rojas', 'Admin', '2026-02-21 14:58:27'),
(28, 1, 'Deactivated user account: Alrashid Rojas', 'Admin', '2026-02-21 14:58:31'),
(29, 1, 'Deactivated user account: Dora The Explorer', 'Admin', '2026-02-21 14:58:47'),
(33, 1, 'Instructor Account Created: Nichole Balgemino', 'Admin: Rojas', '2026-02-21 16:16:23'),
(38, 1, 'Admin Account Created: Asher Laxa', 'Admin', '2026-02-21 16:50:57'),
(39, 1, 'Instructor Account Created: Nichole Balgemino', 'Admin: Rojas', '2026-02-21 17:01:17'),
(40, 1, 'Admin Account Created: Asher Laxa', 'Admin: Rojas', '2026-02-21 17:03:36'),
(41, 44, 'Student Account Registered: Alrashid Rojas', 'Student: Rojas', '2026-02-21 17:05:03'),
(42, 45, 'Student Account Registered: Mey Ocenar', 'Student: Ocenar', '2026-02-21 17:16:42'),
(45, 1, 'Instructor Account Created (OTP Sent): de real', 'Admin: Rojas', '2026-02-21 17:42:36'),
(46, 1, 'Admin-Created Account Cancelled: test3@spist.edu.ph', 'Admin ID: 1', '2026-02-21 17:43:22'),
(47, 1, 'Instructor Account Created (OTP Sent): de real', 'Admin: Rojas', '2026-02-21 17:48:43'),
(48, 1, 'Admin-Created Account Cancelled: test3@spist.edu.ph', 'Admin: Rojas', '2026-02-21 17:48:47'),
(49, 1, 'Instructor Account Created (OTP Sent): de real', 'Admin: Rojas', '2026-02-21 17:51:22'),
(50, 50, 'Student Account Registered: de real', 'Student: real', '2026-02-21 17:51:33'),
(51, 1, 'Admin-Created Account Cancelled: test4@spist.edu.ph', 'Admin: Rojas', '2026-02-21 17:53:49'),
(52, 1, 'Deactivated user account: Alrashid Rojas', 'Admin', '2026-02-22 09:24:36'),
(53, 1, 'Activated user account: Alrashid Rojas', 'Admin', '2026-02-22 09:24:42'),
(54, 1, 'Deactivated user account: Alrashid Rojas', 'Admin', '2026-02-22 09:24:44'),
(55, 1, 'Activated user account: Alrashid Rojas', 'Admin: Rojas', '2026-02-22 11:08:12'),
(56, 1, 'Activated user account: Alrashid Rojas', 'Admin: Rojas', '2026-02-22 11:08:13'),
(57, 1, 'Deactivated user account: Alrashid Rojas', 'Admin: Rojas', '2026-02-22 11:08:15'),
(58, 1, 'Activated user account: Alrashid Rojas', 'Admin: Rojas', '2026-02-22 11:08:18'),
(59, 1, 'Deactivated user account: Alrashid Rojas', 'Admin: Rojas', '2026-02-22 17:20:12'),
(60, 1, 'Changed admin password', 'System', '2026-02-22 18:31:51'),
(61, 1, 'Changed admin password', 'Admin: Rojas', '2026-02-22 18:43:42'),
(62, 43, 'Activated user account: Dora The Explorer', 'Admin: Laxa', '2026-02-22 19:10:08');

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

CREATE TABLE `notification` (
  `NotificationID` int(100) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `DescID` int(11) DEFAULT NULL,
  `Message` text DEFAULT NULL,
  `Type` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification`
--

INSERT INTO `notification` (`NotificationID`, `UserID`, `DescID`, `Message`, `Type`, `is_read`, `created_at`) VALUES
(4, 42, NULL, 'Mey Ocenar has joined your project: PMT', 'member_joined', 0, '2026-02-23 17:07:37'),
(5, 42, NULL, 'Mey Ocenar has joined your project: PMT1', 'member_joined', 0, '2026-02-23 17:25:20'),
(6, 42, NULL, 'Mey Ocenar has joined your project: PMT3', 'member_joined', 0, '2026-02-25 00:43:59'),
(7, 42, NULL, 'Mey Ocenar has joined your project: PMT4', 'member_joined', 0, '2026-02-25 00:44:25'),
(8, 45, NULL, 'You have been assigned a new task: TASK 1', 'task_assigned', 0, '2026-02-25 10:25:13'),
(9, 45, NULL, 'Task completed: TASK 1', 'task_completed', 0, '2026-02-25 10:46:11'),
(10, 45, NULL, 'Task completed: TASK 1', 'task_completed', 0, '2026-02-25 10:46:17'),
(11, 45, NULL, 'Task completed: TASK 1', 'task_completed', 0, '2026-02-25 10:58:35'),
(12, 45, NULL, 'Task completed: TASK 1', 'task_completed', 0, '2026-02-25 11:52:32'),
(13, 45, NULL, 'Task completed: TASK 1', 'task_completed', 0, '2026-02-25 11:58:04'),
(14, 45, NULL, 'Task completed: TASK 1', 'task_completed', 0, '2026-02-25 11:58:14'),
(15, 45, NULL, 'You have been assigned a new task: 123', 'task_assigned', 0, '2026-02-25 11:59:34'),
(16, 45, NULL, 'Task completed: 123', 'task_completed', 0, '2026-02-25 11:59:39'),
(17, 45, NULL, 'Task completed: TASK 1', 'task_completed', 0, '2026-02-25 11:59:42'),
(18, 45, NULL, 'Task completed: 123', 'task_completed', 0, '2026-02-25 11:59:51'),
(19, 45, NULL, 'Task completed: 123', 'task_completed', 0, '2026-02-25 12:00:47'),
(20, 45, NULL, 'Task completed: 123', 'task_completed', 0, '2026-02-25 12:00:54'),
(21, 45, NULL, 'Task completed: 123', 'task_completed', 0, '2026-02-25 12:00:59'),
(22, 45, NULL, 'Task completed: 123', 'task_completed', 0, '2026-02-25 12:08:00'),
(23, 45, NULL, 'Task completed: TASK 1', 'task_completed', 0, '2026-02-25 12:14:46'),
(24, 45, NULL, 'Task completed: TASK 1', 'task_completed', 0, '2026-02-25 12:14:57'),
(25, 45, NULL, 'Task completed: 123', 'task_completed', 0, '2026-02-25 12:57:29'),
(26, 45, NULL, 'Task completed: 123', 'task_completed', 0, '2026-02-25 12:57:33'),
(27, 45, NULL, 'Task completed: 123', 'task_completed', 0, '2026-02-25 12:57:37'),
(28, 45, NULL, 'Task completed: 123', 'task_completed', 0, '2026-02-25 12:57:43'),
(29, 45, NULL, 'Task completed: 123', 'task_completed', 0, '2026-02-25 12:57:59'),
(30, 45, NULL, 'You have been assigned a new task: task 3', 'task_assigned', 0, '2026-02-25 14:34:52');

-- --------------------------------------------------------

--
-- Table structure for table `notification_desc`
--

CREATE TABLE `notification_desc` (
  `DescID` int(11) NOT NULL,
  `Desc_Status` varchar(100) DEFAULT NULL,
  `Desc_Title` varchar(100) DEFAULT NULL,
  `Notif_Desc` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project`
--

CREATE TABLE `project` (
  `ProjectID` int(100) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `ProjectName` varchar(100) NOT NULL,
  `Description` text DEFAULT NULL,
  `StartDate` date DEFAULT NULL,
  `EndDate` date DEFAULT NULL,
  `Password` varchar(255) DEFAULT NULL,
  `Status` varchar(50) DEFAULT 'Active',
  `Code` varchar(100) NOT NULL,
  `color` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `project`
--

INSERT INTO `project` (`ProjectID`, `UserID`, `ProjectName`, `Description`, `StartDate`, `EndDate`, `Password`, `Status`, `Code`, `color`, `created_at`, `updated_at`) VALUES
(11, 42, 'PMT', 'PROJECT & TASK', NULL, NULL, '$2y$10$Ctb3uJuoxgR8EfkjhcYlJuOxS548vCnT1y5Oi9vN5hxZIedLtuk46', 'Active', 'DiuIEFEX', 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', '2026-02-23 16:42:53', '2026-02-23 17:13:33'),
(12, 42, 'PMT1', 'P&T', NULL, NULL, '$2y$10$MmGlYzpvhHEXyC6AcjwQ3.ClUclTlOHtBTWPQuKHcBv0jPSC36D6.', 'Active', '4NmLj3eO', 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', '2026-02-23 17:23:56', NULL),
(13, 42, 'PMT3', 'PT', NULL, NULL, '$2y$10$tUfxJ4HRtpVfODoMLRuzyuutWLbEAwzoRfOBR0RACZYk9cPNolGZu', 'Active', 'WTybOgD0', 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)', '2026-02-24 10:53:32', NULL),
(14, 42, 'PMT4', 'PT', NULL, NULL, '$2y$10$hQ0Upi6/Uyl/1kpMLokoauRSykruMFMILLQFARubesNP.RbAnGciq', 'Active', 'fHF8mtht', 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)', '2026-02-24 10:55:00', NULL),
(15, 42, 'PMT5', 'PT', NULL, NULL, '$2y$10$qagjvgg8ufbA26b9V3ykBucJu3RGpIoveNZR8cVAKhO/mXBtum1PK', 'Active', 'Q0dtpPJg', 'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)', '2026-02-24 11:06:53', NULL),
(16, 42, 'ewgew vgwresv grwgh', 'gewrgvrewgvregv', NULL, NULL, '$2y$10$358b8WKd93QYHCP53Uphhe1LL8jKoG811.MN3TikF525ij8cgDHOG', 'Active', 'X0xlzVzh', 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', '2026-02-25 08:24:09', NULL),
(17, 42, 'vedwuhf vrewdvconwjivcw eicpvnewojvncewdiojnfcewdioujfb', 'fcewasfewgwyhgecsahcbasipcnsaopmcxsalpkx,msp]sap]ocvndsiopvfnrwiuogvhnuregber', NULL, NULL, '$2y$10$EbfFQrdrWbHT0PKKSf.qqOQSy5AO5z/REJqvKkSEBYWu5NpkfXOk6', 'Active', 'hH17cPyv', 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', '2026-02-25 08:24:41', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `project_members`
--

CREATE TABLE `project_members` (
  `ID` int(11) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `ProjectID` int(11) DEFAULT NULL,
  `Role` varchar(50) DEFAULT NULL,
  `Join_Date` timestamp NOT NULL DEFAULT current_timestamp(),
  `Leave_Date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `project_members`
--

INSERT INTO `project_members` (`ID`, `UserID`, `ProjectID`, `Role`, `Join_Date`, `Leave_Date`) VALUES
(15, 42, 11, 'Host', '2026-02-23 16:42:54', NULL),
(16, 45, 11, 'Member', '2026-02-23 17:07:37', NULL),
(17, 42, 12, 'Host', '2026-02-23 17:23:56', NULL),
(18, 45, 12, 'Member', '2026-02-23 17:25:20', NULL),
(19, 42, 13, 'Host', '2026-02-24 10:53:32', NULL),
(20, 42, 14, 'Host', '2026-02-24 10:55:00', NULL),
(21, 42, 15, 'Host', '2026-02-24 11:06:53', NULL),
(22, 45, 13, 'Member', '2026-02-25 00:43:59', NULL),
(23, 45, 14, 'Member', '2026-02-25 00:44:25', NULL),
(24, 42, 16, 'Host', '2026-02-25 08:24:09', NULL),
(25, 42, 17, 'Host', '2026-02-25 08:24:41', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `task`
--

CREATE TABLE `task` (
  `TaskID` int(100) NOT NULL,
  `ProjectID` int(11) DEFAULT NULL,
  `TaskName` varchar(100) NOT NULL,
  `Description` text DEFAULT NULL,
  `Attachment` varchar(255) DEFAULT NULL,
  `Status` varchar(50) DEFAULT 'To Do',
  `StartDate` date DEFAULT NULL,
  `DueDate` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task`
--

INSERT INTO `task` (`TaskID`, `ProjectID`, `TaskName`, `Description`, `Attachment`, `Status`, `StartDate`, `DueDate`, `created_at`, `updated_at`) VALUES
(1, 11, 'TASK 1', '', NULL, 'To Do', NULL, NULL, '2026-02-25 10:25:13', '2026-02-25 20:14:59'),
(2, 11, '123', '', NULL, 'To Do', NULL, '2026-02-24', '2026-02-25 11:59:33', '2026-02-25 20:58:02'),
(3, 11, 'task 3', 'example description', NULL, 'To Do', NULL, '2026-02-28', '2026-02-25 14:34:51', '2026-02-25 22:46:35');

-- --------------------------------------------------------

--
-- Table structure for table `task_assignees`
--

CREATE TABLE `task_assignees` (
  `id` int(11) NOT NULL,
  `TaskID` int(100) NOT NULL,
  `UserID` int(11) NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task_assignees`
--

INSERT INTO `task_assignees` (`id`, `TaskID`, `UserID`, `assigned_at`) VALUES
(1, 1, 45, '2026-02-25 10:25:13'),
(2, 2, 45, '2026-02-25 11:59:33'),
(3, 3, 42, '2026-02-25 14:34:51');

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `UserID` int(100) NOT NULL,
  `Email` varchar(100) NOT NULL,
  `Contact_num` varchar(100) DEFAULT NULL,
  `FirstName` varchar(100) NOT NULL,
  `LastName` varchar(100) NOT NULL,
  `Password` varchar(255) NOT NULL,
  `role` enum('admin','project_manager','member') NOT NULL DEFAULT 'member',
  `OTP` varchar(6) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_verified` tinyint(1) DEFAULT 0,
  `Status` varchar(50) DEFAULT 'Pending',
  `Address` varchar(255) DEFAULT NULL,
  `Photo` varchar(255) DEFAULT NULL,
  `reset_otp` varchar(6) DEFAULT NULL,
  `reset_otp_expires` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`UserID`, `Email`, `Contact_num`, `FirstName`, `LastName`, `Password`, `role`, `OTP`, `created_at`, `is_verified`, `Status`, `Address`, `Photo`, `reset_otp`, `reset_otp_expires`) VALUES
(1, 'c22-4810-01@spist.edu.ph', '09098835592', 'Alrashid', 'Rojas', '$2y$10$rD7kYz6U/CLa9G4.EQYflOv1ghigAOtvdN7dCalCkgGpqQez7Hhfy', 'admin', NULL, '2026-02-22 18:43:42', 1, 'Active', NULL, '1771516813_6997338da0b19.jpg', NULL, NULL),
(11, 'sample@gmail.com', NULL, 'Alrashid', 'Rojas', '$2y$10$prMiSJreho.7EV664PyujOXcmiB4eZ3.JlJVNkxm3jRzEn5fkWJIq', 'member', NULL, '2026-02-22 11:08:15', 1, 'Deactivated', NULL, NULL, NULL, NULL),
(18, 'alrashid@gmail.com', '09123456789', 'Alrashid', 'Rojas', '$2y$10$zo0TGn.RVU1srkOJtS41d.hPdSlOw9b9WgnUzUy1lIweVSKCNKJR6', 'member', NULL, '2026-02-22 17:20:12', 1, 'Deactivated', 'Imus City, Cavite', NULL, NULL, NULL),
(25, 'c22-4810-20@spist.edu.ph', NULL, 'Shid', 'Rojas', '$2y$10$rVksYMnQ2qrwtVQ3p36joujxSrHnkq4QIX2NkPfhU2iphcDkp08F.', 'member', NULL, '2026-02-23 08:47:42', 1, 'Active', NULL, NULL, NULL, NULL),
(27, 'boots123@gmail.com', '09123456789', 'Dora The', 'Explorer', '$2y$10$lLonsezRfA/6DZKqGaeLaeBK1H3JjDcKB2NuxeHLcfTfyfyGZtO/C', 'member', NULL, '2026-02-22 19:10:07', 1, 'Active', NULL, '1771525675_6997562bdf560.jfif', NULL, NULL),
(28, 'instructor@gmail.com', NULL, 'Tom', 'Jerry', '$2y$10$E7a/Dv4CfVOcmfkTfFuH2uR50NtouBxFlqKGPS5YiHcsV.a96Y1Yy', 'project_manager', NULL, '2026-02-10 08:21:02', 1, 'Active', NULL, NULL, NULL, NULL),
(42, 'c25-4525-01@spist.edu.ph', '09123456789', 'Nichole', 'Balgemino', '$2y$10$HxSqGhXvH22N07rbeNIiNeuCWg.jMWUIozxNM.5cO5fhkIB9eDKde', 'project_manager', NULL, '2026-02-23 16:09:50', 1, 'Active', NULL, '1771862990_699c7bce62291.jfif', NULL, NULL),
(43, 'c22-4731-01@spist.edu.ph', NULL, 'Asher', 'Laxa', '$2y$10$dCqoUIOvrO6sjlMyYaWFzO1THF3vMlL3vq/WsjRp.WivzbFJKSElG', 'admin', NULL, '2026-02-21 17:03:36', 1, 'Active', NULL, NULL, NULL, NULL),
(44, 'test@spist.edu.ph', NULL, 'Alrashid', 'Rojas', '$2y$10$Wqwo55PCQupt107p8oVksuJJ37qw2xiqL6PaygLAWj0LHs/bIZuge', 'member', NULL, '2026-02-21 17:05:03', 1, 'Active', NULL, NULL, NULL, NULL),
(45, 'test2@spist.edu.ph', '09123456789', 'Mey', 'Ocenar', '$2y$10$1jpvRUG5bBgDTXlue1Tnlu8OZMkhG9/C3QXVGaBwxb9etUembBzs6', 'member', NULL, '2026-02-23 16:11:40', 1, 'Active', NULL, '1771863100_699c7c3c468b5.jpg', NULL, NULL),
(50, 'test3@spist.edu.ph', '09123456789', 'Zyeann', 'De Real', '$2y$10$RjLTES8m1aTKKur9mOeMDe7qTqMYAS/nNoKrnTnB2HY7Sayl8vl6a', 'project_manager', NULL, '2026-02-23 15:54:06', 1, 'Active', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_logs`
--

CREATE TABLE `user_logs` (
  `LogID` int(11) NOT NULL,
  `UserID` int(11) NOT NULL,
  `TimeIn` datetime NOT NULL,
  `TimeOut` datetime DEFAULT NULL,
  `CreatedAt` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_logs`
--

INSERT INTO `user_logs` (`LogID`, `UserID`, `TimeIn`, `TimeOut`, `CreatedAt`) VALUES
(6, 1, '2026-02-05 12:30:37', '2026-02-05 14:10:45', '2026-02-05 04:30:37'),
(7, 1, '2026-02-05 12:44:55', NULL, '2026-02-05 04:44:55'),
(8, 18, '2026-02-05 12:53:44', '2026-02-05 12:54:48', '2026-02-05 04:53:44'),
(9, 1, '2026-02-05 12:56:12', NULL, '2026-02-05 04:56:12'),
(10, 1, '2026-02-05 13:02:44', NULL, '2026-02-05 05:02:44'),
(11, 1, '2026-02-05 13:10:56', '2026-02-05 13:11:02', '2026-02-05 05:10:56'),
(12, 27, '2026-02-05 13:34:16', NULL, '2026-02-05 05:34:16'),
(13, 27, '2026-02-05 13:37:08', '2026-02-05 13:37:24', '2026-02-05 05:37:08'),
(14, 1, '2026-02-05 13:38:12', '2026-02-05 13:54:15', '2026-02-05 05:38:12'),
(15, 1, '2026-02-05 13:51:49', '2026-02-05 14:00:53', '2026-02-05 05:51:49'),
(16, 1, '2026-02-05 14:17:15', '2026-02-05 15:25:53', '2026-02-05 06:17:15'),
(17, 27, '2026-02-05 15:26:57', '2026-02-05 15:27:07', '2026-02-05 07:26:57'),
(18, 1, '2026-02-05 15:27:22', '2026-02-05 15:29:51', '2026-02-05 07:27:22'),
(19, 1, '2026-02-05 15:31:16', '2026-02-05 15:31:20', '2026-02-05 07:31:16'),
(20, 1, '2026-02-05 15:33:04', '2026-02-05 18:25:08', '2026-02-05 07:33:04'),
(21, 1, '2026-02-05 18:32:28', '2026-02-05 18:34:10', '2026-02-05 10:32:28'),
(22, 27, '2026-02-05 18:34:25', '2026-02-05 18:45:37', '2026-02-05 10:34:25'),
(23, 27, '2026-02-05 19:16:55', '2026-02-05 19:29:35', '2026-02-05 11:16:55'),
(24, 27, '2026-02-05 19:32:13', '2026-02-05 20:08:33', '2026-02-05 11:32:13'),
(25, 1, '2026-02-05 20:08:41', NULL, '2026-02-05 12:08:41'),
(26, 1, '2026-02-10 15:22:18', '2026-02-10 15:23:56', '2026-02-10 07:22:18'),
(27, 27, '2026-02-10 15:37:10', '2026-02-10 16:04:01', '2026-02-10 07:37:10'),
(28, 28, '2026-02-10 16:05:30', NULL, '2026-02-10 08:05:30'),
(29, 1, '2026-02-10 16:16:26', '2026-02-10 16:40:07', '2026-02-10 08:16:26'),
(30, 27, '2026-02-10 16:41:50', NULL, '2026-02-10 08:41:50'),
(31, 27, '2026-02-10 17:22:17', NULL, '2026-02-10 09:22:17'),
(32, 27, '2026-02-13 17:43:57', '2026-02-13 17:44:31', '2026-02-13 09:43:57'),
(33, 1, '2026-02-13 17:44:37', NULL, '2026-02-13 09:44:37'),
(34, 27, '2026-02-17 18:22:27', NULL, '2026-02-17 10:22:27'),
(35, 1, '2026-02-19 23:17:08', '2026-02-19 23:17:42', '2026-02-19 15:17:08'),
(36, 1, '2026-02-19 23:17:49', '2026-02-19 23:20:30', '2026-02-19 15:17:49'),
(37, 27, '2026-02-19 23:20:46', '2026-02-19 23:55:14', '2026-02-19 15:20:46'),
(38, 1, '2026-02-19 23:55:29', '2026-02-19 23:56:34', '2026-02-19 15:55:29'),
(39, 1, '2026-02-19 23:59:06', '2026-02-20 00:31:04', '2026-02-19 15:59:06'),
(40, 27, '2026-02-20 00:36:44', '2026-02-20 00:53:01', '2026-02-19 16:36:44'),
(41, 1, '2026-02-20 00:53:08', '2026-02-20 01:38:47', '2026-02-19 16:53:08'),
(42, 27, '2026-02-20 01:39:01', '2026-02-20 02:32:50', '2026-02-19 17:39:01'),
(43, 27, '2026-02-20 02:33:44', '2026-02-20 02:52:16', '2026-02-19 18:33:44'),
(44, 1, '2026-02-20 14:39:31', '2026-02-20 15:20:52', '2026-02-20 06:39:31'),
(45, 27, '2026-02-20 15:21:18', '2026-02-20 15:24:19', '2026-02-20 07:21:18'),
(46, 1, '2026-02-20 15:24:31', '2026-02-20 15:27:03', '2026-02-20 07:24:31'),
(47, 1, '2026-02-20 15:28:35', '2026-02-20 16:42:31', '2026-02-20 07:28:35'),
(48, 27, '2026-02-20 16:42:58', '2026-02-20 16:45:58', '2026-02-20 08:42:58'),
(49, 1, '2026-02-20 16:46:09', NULL, '2026-02-20 08:46:09'),
(50, 1, '2026-02-20 18:24:43', '2026-02-20 18:27:54', '2026-02-20 10:24:43'),
(51, 27, '2026-02-20 18:28:19', NULL, '2026-02-20 10:28:19'),
(52, 1, '2026-02-20 21:48:38', '2026-02-20 23:26:07', '2026-02-20 13:48:38'),
(53, 27, '2026-02-20 23:26:37', '2026-02-20 23:34:52', '2026-02-20 15:26:37'),
(54, 1, '2026-02-20 23:34:58', '2026-02-20 23:56:24', '2026-02-20 15:34:58'),
(55, 27, '2026-02-20 23:56:37', '2026-02-21 00:17:13', '2026-02-20 15:56:37'),
(56, 1, '2026-02-21 00:17:21', NULL, '2026-02-20 16:17:21'),
(57, 1, '2026-02-21 12:31:45', '2026-02-21 12:55:49', '2026-02-21 04:31:45'),
(58, 27, '2026-02-21 12:56:03', '2026-02-21 12:57:10', '2026-02-21 04:56:03'),
(59, 27, '2026-02-21 12:57:28', '2026-02-21 13:03:17', '2026-02-21 04:57:28'),
(60, 1, '2026-02-21 13:03:27', '2026-02-21 15:33:10', '2026-02-21 05:03:27'),
(61, 1, '2026-02-21 15:33:43', NULL, '2026-02-21 07:33:43'),
(62, 1, '2026-02-21 18:17:36', '2026-02-21 23:19:22', '2026-02-21 10:17:36'),
(63, 1, '2026-02-21 23:19:31', '2026-02-22 00:28:09', '2026-02-21 15:19:31'),
(64, 1, '2026-02-22 00:34:58', '2026-02-22 00:37:42', '2026-02-21 16:34:58'),
(65, 1, '2026-02-22 00:38:59', '2026-02-22 01:04:07', '2026-02-21 16:38:59'),
(66, 1, '2026-02-22 01:23:03', '2026-02-22 12:05:32', '2026-02-21 17:23:03'),
(67, 1, '2026-02-22 12:06:39', '2026-02-22 20:36:50', '2026-02-22 04:06:39'),
(68, 1, '2026-02-22 20:37:00', '2026-02-22 22:33:10', '2026-02-22 12:37:00'),
(69, 1, '2026-02-22 22:33:18', '2026-02-22 22:34:33', '2026-02-22 14:33:18'),
(70, 43, '2026-02-22 22:34:52', '2026-02-22 22:44:26', '2026-02-22 14:34:52'),
(71, 1, '2026-02-22 22:44:32', '2026-02-22 22:53:29', '2026-02-22 14:44:32'),
(72, 43, '2026-02-22 22:53:48', '2026-02-22 23:36:10', '2026-02-22 14:53:48'),
(73, 1, '2026-02-22 23:36:17', '2026-02-22 23:37:36', '2026-02-22 15:36:17'),
(74, 43, '2026-02-22 23:37:51', '2026-02-22 23:41:19', '2026-02-22 15:37:51'),
(75, 1, '2026-02-22 23:59:18', '2026-02-22 23:59:51', '2026-02-22 15:59:18'),
(76, 1, '2026-02-23 00:00:36', '2026-02-23 02:45:15', '2026-02-22 16:00:36'),
(77, 43, '2026-02-23 02:45:29', '2026-02-23 02:47:10', '2026-02-22 18:45:29'),
(78, 1, '2026-02-23 02:47:18', '2026-02-23 02:47:29', '2026-02-22 18:47:18'),
(79, 43, '2026-02-23 02:47:42', NULL, '2026-02-22 18:47:42'),
(80, 1, '2026-02-23 14:42:36', '2026-02-23 14:43:03', '2026-02-23 06:42:36'),
(81, 1, '2026-02-23 14:43:11', '2026-02-23 14:54:03', '2026-02-23 06:43:11'),
(82, 25, '2026-02-23 15:03:55', '2026-02-23 15:11:03', '2026-02-23 07:03:55'),
(83, 1, '2026-02-23 15:11:17', '2026-02-23 15:13:46', '2026-02-23 07:11:17'),
(84, 25, '2026-02-23 15:14:03', '2026-02-23 16:48:04', '2026-02-23 07:14:03'),
(85, 1, '2026-02-23 16:48:11', '2026-02-23 16:54:52', '2026-02-23 08:48:11'),
(86, 25, '2026-02-23 16:55:09', '2026-02-23 17:28:20', '2026-02-23 08:55:09'),
(87, 1, '2026-02-23 17:28:29', '2026-02-23 17:35:55', '2026-02-23 09:28:29'),
(88, 25, '2026-02-23 17:36:04', '2026-02-23 21:02:27', '2026-02-23 09:36:04'),
(89, 1, '2026-02-23 21:02:45', '2026-02-23 22:20:09', '2026-02-23 13:02:45'),
(90, 25, '2026-02-23 22:20:35', '2026-02-23 22:27:38', '2026-02-23 14:20:35'),
(91, 42, '2026-02-23 22:28:43', '2026-02-23 22:51:05', '2026-02-23 14:28:43'),
(92, 45, '2026-02-23 22:51:33', '2026-02-23 22:53:10', '2026-02-23 14:51:33'),
(93, 50, '2026-02-23 22:53:21', '2026-02-23 23:18:45', '2026-02-23 14:53:21'),
(94, 50, '2026-02-23 23:23:50', '2026-02-23 23:31:14', '2026-02-23 15:23:50'),
(95, 45, '2026-02-23 23:31:37', '2026-02-23 23:37:41', '2026-02-23 15:31:37'),
(96, 50, '2026-02-23 23:38:03', '2026-02-24 00:08:51', '2026-02-23 15:38:03'),
(97, 42, '2026-02-24 00:09:02', '2026-02-24 00:10:13', '2026-02-23 16:09:02'),
(98, 45, '2026-02-24 00:10:51', '2026-02-24 00:33:02', '2026-02-23 16:10:51'),
(99, 42, '2026-02-24 00:34:15', '2026-02-24 00:40:41', '2026-02-23 16:34:15'),
(100, 45, '2026-02-24 00:40:54', '2026-02-24 00:41:00', '2026-02-23 16:40:54'),
(101, 42, '2026-02-24 00:41:12', '2026-02-24 01:00:56', '2026-02-23 16:41:12'),
(102, 45, '2026-02-24 01:06:30', '2026-02-24 01:22:40', '2026-02-23 17:06:30'),
(103, 42, '2026-02-24 01:23:35', '2026-02-24 01:24:43', '2026-02-23 17:23:35'),
(104, 45, '2026-02-24 01:25:05', '2026-02-24 01:28:40', '2026-02-23 17:25:05'),
(105, 42, '2026-02-24 01:29:12', NULL, '2026-02-23 17:29:12'),
(106, 45, '2026-02-24 15:22:34', '2026-02-24 15:23:33', '2026-02-24 07:22:34'),
(107, 42, '2026-02-24 15:23:54', '2026-02-24 19:16:45', '2026-02-24 07:23:54'),
(108, 45, '2026-02-24 19:17:07', '2026-02-24 19:56:28', '2026-02-24 11:17:07'),
(109, 42, '2026-02-24 19:56:55', '2026-02-24 20:06:20', '2026-02-24 11:56:55'),
(110, 45, '2026-02-24 20:06:41', '2026-02-24 20:07:17', '2026-02-24 12:06:41'),
(111, 42, '2026-02-24 20:07:46', '2026-02-25 01:03:47', '2026-02-24 12:07:46'),
(112, 45, '2026-02-25 01:04:16', '2026-02-25 09:20:51', '2026-02-24 17:04:16'),
(113, 42, '2026-02-25 09:21:08', '2026-02-25 09:21:44', '2026-02-25 01:21:08'),
(114, 45, '2026-02-25 09:22:02', '2026-02-25 10:29:07', '2026-02-25 01:22:02'),
(115, 42, '2026-02-25 10:29:48', '2026-02-25 11:37:38', '2026-02-25 02:29:48'),
(116, 45, '2026-02-25 11:37:53', '2026-02-25 11:49:03', '2026-02-25 03:37:53'),
(117, 42, '2026-02-25 11:49:19', '2026-02-25 11:50:16', '2026-02-25 03:49:19'),
(118, 1, '2026-02-25 11:50:24', '2026-02-25 12:02:46', '2026-02-25 03:50:24'),
(119, 45, '2026-02-25 12:03:02', '2026-02-25 14:50:12', '2026-02-25 04:03:02'),
(120, 42, '2026-02-25 14:50:25', '2026-02-25 14:55:24', '2026-02-25 06:50:25'),
(121, 45, '2026-02-25 14:55:37', '2026-02-25 16:11:20', '2026-02-25 06:55:37'),
(122, 42, '2026-02-25 16:11:33', '2026-02-25 16:11:53', '2026-02-25 08:11:33'),
(123, 45, '2026-02-25 16:12:05', '2026-02-25 16:22:52', '2026-02-25 08:12:05'),
(124, 42, '2026-02-25 16:23:08', NULL, '2026-02-25 08:23:08');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_passwords`
--
ALTER TABLE `admin_passwords`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `admin_id` (`admin_id`);

--
-- Indexes for table `archive_project`
--
ALTER TABLE `archive_project`
  ADD PRIMARY KEY (`ArchiveID`),
  ADD KEY `fk_archive_project_project` (`ProjectID`),
  ADD KEY `fk_archive_project_user` (`UserID`);

--
-- Indexes for table `comment`
--
ALTER TABLE `comment`
  ADD PRIMARY KEY (`CommentID`),
  ADD KEY `fk_comment_project` (`ProjectID`),
  ADD KEY `fk_comment_task` (`TaskID`),
  ADD KEY `fk_comment_user` (`UserID`);

--
-- Indexes for table `event_logs`
--
ALTER TABLE `event_logs`
  ADD PRIMARY KEY (`EventID`),
  ADD KEY `UserID_idx` (`UserID`);

--
-- Indexes for table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`NotificationID`),
  ADD KEY `fk_notification_user` (`UserID`),
  ADD KEY `fk_notification_desc` (`DescID`);

--
-- Indexes for table `notification_desc`
--
ALTER TABLE `notification_desc`
  ADD PRIMARY KEY (`DescID`);

--
-- Indexes for table `project`
--
ALTER TABLE `project`
  ADD PRIMARY KEY (`ProjectID`),
  ADD KEY `fk_project_user` (`UserID`);

--
-- Indexes for table `project_members`
--
ALTER TABLE `project_members`
  ADD PRIMARY KEY (`ID`),
  ADD KEY `UserID` (`UserID`),
  ADD KEY `ProjectID` (`ProjectID`);

--
-- Indexes for table `task`
--
ALTER TABLE `task`
  ADD PRIMARY KEY (`TaskID`),
  ADD KEY `fk_task_project` (`ProjectID`);

--
-- Indexes for table `task_assignees`
--
ALTER TABLE `task_assignees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_task_user` (`TaskID`,`UserID`),
  ADD KEY `idx_task_assignees_task` (`TaskID`),
  ADD KEY `idx_task_assignees_user` (`UserID`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`UserID`),
  ADD UNIQUE KEY `Email` (`Email`);

--
-- Indexes for table `user_logs`
--
ALTER TABLE `user_logs`
  ADD PRIMARY KEY (`LogID`),
  ADD KEY `UserID_idx` (`UserID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_passwords`
--
ALTER TABLE `admin_passwords`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `archive_project`
--
ALTER TABLE `archive_project`
  MODIFY `ArchiveID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `comment`
--
ALTER TABLE `comment`
  MODIFY `CommentID` int(100) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `event_logs`
--
ALTER TABLE `event_logs`
  MODIFY `EventID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT for table `notification`
--
ALTER TABLE `notification`
  MODIFY `NotificationID` int(100) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `notification_desc`
--
ALTER TABLE `notification_desc`
  MODIFY `DescID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `project`
--
ALTER TABLE `project`
  MODIFY `ProjectID` int(100) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `project_members`
--
ALTER TABLE `project_members`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `task`
--
ALTER TABLE `task`
  MODIFY `TaskID` int(100) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `task_assignees`
--
ALTER TABLE `task_assignees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `UserID` int(100) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT for table `user_logs`
--
ALTER TABLE `user_logs`
  MODIFY `LogID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=125;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_passwords`
--
ALTER TABLE `admin_passwords`
  ADD CONSTRAINT `fk_admin_passwords_user` FOREIGN KEY (`admin_id`) REFERENCES `user` (`UserID`) ON DELETE CASCADE;

--
-- Constraints for table `archive_project`
--
ALTER TABLE `archive_project`
  ADD CONSTRAINT `fk_archive_project_project` FOREIGN KEY (`ProjectID`) REFERENCES `project` (`ProjectID`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_archive_project_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE;

--
-- Constraints for table `comment`
--
ALTER TABLE `comment`
  ADD CONSTRAINT `fk_comment_project` FOREIGN KEY (`ProjectID`) REFERENCES `project` (`ProjectID`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_comment_task` FOREIGN KEY (`TaskID`) REFERENCES `task` (`TaskID`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_comment_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE;

--
-- Constraints for table `event_logs`
--
ALTER TABLE `event_logs`
  ADD CONSTRAINT `event_logs_fk_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE;

--
-- Constraints for table `notification`
--
ALTER TABLE `notification`
  ADD CONSTRAINT `fk_notification_desc` FOREIGN KEY (`DescID`) REFERENCES `notification_desc` (`DescID`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notification_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE;

--
-- Constraints for table `project`
--
ALTER TABLE `project`
  ADD CONSTRAINT `fk_project_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE;

--
-- Constraints for table `project_members`
--
ALTER TABLE `project_members`
  ADD CONSTRAINT `project_members_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`),
  ADD CONSTRAINT `project_members_ibfk_2` FOREIGN KEY (`ProjectID`) REFERENCES `project` (`ProjectID`);

--
-- Constraints for table `task`
--
ALTER TABLE `task`
  ADD CONSTRAINT `fk_task_project` FOREIGN KEY (`ProjectID`) REFERENCES `project` (`ProjectID`) ON DELETE CASCADE;

--
-- Constraints for table `task_assignees`
--
ALTER TABLE `task_assignees`
  ADD CONSTRAINT `fk_task_assignees_task` FOREIGN KEY (`TaskID`) REFERENCES `task` (`TaskID`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_task_assignees_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE;

--
-- Constraints for table `user_logs`
--
ALTER TABLE `user_logs`
  ADD CONSTRAINT `user_logs_fk_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
