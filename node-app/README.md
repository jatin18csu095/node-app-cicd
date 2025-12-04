<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:h="http://xmlns.jcp.org/jsf/html"
      xmlns:f="http://xmlns.jcp.org/jsf/core"
      xmlns:ui="http://xmlns.jcp.org/jsf/facelets"
      xmlns:hx="http://www.ibm.com/jsf/html_extended"
      xmlns:spocs="WEB-INF/tld/spocs-components.tld">

<head>
    <meta http-equiv="content-type" content="text/html; charset=ISO-8859-1"/>
    <meta name="GENERATOR" content="IBM Software Development Platform"/>
    <meta http-equiv="content-style-type" content="text/css"/>

    <link rel="stylesheet" type="text/css" href="css/global.css" title="Style"/>
    <link rel="stylesheet" type="text/css" href="theme/stylesheet.css" title="Style"/>

    <script type="text/javascript" src="js/global_combined.js"></script>
    <script type="text/javascript" src="js/CalendarPopup.js"></script>

    <script type="text/javascript">
        function onPageLoad() {
            history.forward();
            doOnPageLoad();
        }
        function doOnPageLoad() { }
    </script>

    <title>Document Information</title>
</head>

<body class="XNoScroll" onload="onPageLoad()" style="Scrollbar-face-color:#bcd5f8;">
<f:view>
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
            <td colspan="2">
                <ui:include src="mainHeader.xhtml"/>
            </td>
        </tr>

        <tr>
            <td valign="top">
                <ui:include src="mainSidebar.xhtml"/>
            </td>

            <td valign="top">
                <div id="mainView" style="display:block;">
                    <hx:scriptCollector id="scriptCollector1">

                        <h:messages id="messages" styleClass="contentText" style="color:red;" layout="table"/>

                        <h:form id="documentForm" styleClass="form" enctype="multipart/form-data">

                            <!-- Begin Page Header Table -->
                            <table cellspacing="0" cellpadding="0" border="0" width="885">
                                <tr>
                                    <td><img src="images/spacer.gif" width="1" height="8" alt="spacer"/></td>
                                </tr>

                                <tr>
                                    <td class="breadcrumb">
                                        <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td class="breadcrumbTEXTwhite" width="100%">
                                                    <img src="images/spacer.gif" width="5" height="1" alt="spacer"/>
                                                    <h:outputFormat id="textPolicyInfo"
                                                                    value="Document Information for Case {0}">
                                                        <f:param value="#{pc_DocumentDetail.document.caseNumber}"/>
                                                    </h:outputFormat>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <tr>
                                    <td><img src="images/spacer.gif" width="1" height="5" alt="spacer"/></td>
                                </tr>
                            </table>
                            <!-- End Page Header Table -->


                            <div id="progress"
                                 style="display:none; height:430px; width:885px; overflow:auto; text-align:center">
                            </div>

                            <div id="contentSection"
                                 style="display:block; height:430px; width:100%; overflow:auto;">

                                <table class="viewTableBorder" cellspacing="0" cellpadding="1" border="0" width="885">
                                    <tr>
                                        <td>

                                            <!-- File Panel -->
                                            <h:panelGrid id="filePanel" styleClass="panelGrid" columns="1">

                                                <h:outputText id="filePanelLabel" styleClass="inputheaderB"
                                                              value="Attach Document"/>

                                                <h:panelGrid id="fileUploadPanel"
                                                             rendered="#{pc_DocumentDetail.fileUploadPanelShown}">
                                                    <spocs:fileUpload id="fileupload1"
                                                                      styleClass="contentText"
                                                                      value="#{pc_DocumentDetail.fileUploadBean}"/>
                                                </h:panelGrid>

                                                <h:panelGrid id="fileUploadPanel2"
                                                             rendered="#{!pc_DocumentDetail.fileUploadPanelShown}">
                                                    <h:outputLink value="#{pc_DocumentDetail.downloadUrl}">
                                                        <h:outputFormat styleClass="contentText" value="View {0}">
                                                            <f:param value="#{pc_DocumentDetail.document.documentName}"/>
                                                        </h:outputFormat>
                                                    </h:outputLink>
                                                </h:panelGrid>

                                            </h:panelGrid>


                                            <!-- Date Added / Added By -->
                                            <h:panelGrid id="addedPanel" styleClass="panelGrid"
                                                         columns="2" width="700px">

                                                <h:panelGrid id="dateAddedPanel" styleClass="panelGrid" columns="1">
                                                    <h:outputText id="dateAddedLabel"
                                                                  styleClass="inputheaderB"
                                                                  value="Date Added"/>
                                                    <h:outputText id="dateAddedValue"
                                                                  styleClass="contentText"
                                                                  value="#{pc_DocumentDetail.document.createdDate}">
                                                        <f:convertDateTime pattern="MM/dd/yyyy"/>
                                                    </h:outputText>
                                                </h:panelGrid>

                                                <h:panelGrid id="addedByPanel" styleClass="panelGrid" columns="1">
                                                    <h:outputText id="addedByLabel"
                                                                  styleClass="inputheaderB"
                                                                  value="Added By"/>
                                                    <h:outputText id="addedByValue"
                                                                  styleClass="contentText"
                                                                  value="#{pc_DocumentDetail.document.createdBy}"/>
                                                </h:panelGrid>

                                            </h:panelGrid>


                                            <!-- Comments Section -->
                                            <h:panelGrid id="commentsPanel" styleClass="panelGrid">
                                                <h:panelGrid columns="2">
                                                    <h:outputText styleClass="inputheaderB" value="Comments"/>

                                                    <h:panelGroup id="commentIcons"
                                                                  rendered="#{pc_DocumentDetail.document.fieldRules.commentsEditable}">
                                                        <h:graphicImage id="toggleImage"
                                                                        alt="Expand"
                                                                        value="images/open_arrow.gif"
                                                                        onclick="return toggleCommentExpandCollapse(this,'documentForm:commentsTextarea','300px','600px','50px','400px');"/>

                                                        <h:graphicImage id="commentSpellCheck"
                                                                        alt="Spell Check"
                                                                        value="images/SpellCheck.jpg"
                                                                        onclick="return fDoSpellCheck('documentForm:commentsTextarea', 'Comment');"/>
                                                    </h:panelGroup>

                                                    <h:outputText id="fillerText001"
                                                                  value=""
                                                                  rendered="#{!pc_DocumentDetail.document.fieldRules.commentsEditable}"/>
                                                </h:panelGrid>

                                                <spocs:alternateDisplay
                                                        condition="#{pc_DocumentDetail.document.fieldRules.commentsEditable}"
                                                        value="true">

                                                    <h:inputTextarea id="commentsTextarea"
                                                                     styleClass="contentText"
                                                                     style="width:500px;height:100px;Scrollbar-face-color:#bcd5f8;"
                                                                     value="#{pc_DocumentDetail.document.comment}">
                                                        <f:validateLength maximum="500"/>
                                                    </h:inputTextarea>

                                                    <h:outputText id="commentsTextarea_2"
                                                                  styleClass="contentText showLineBreak"
                                                                  value="#{pc_DocumentDetail.formattedComment}"
                                                                  escape="true"/>

                                                </spocs:alternateDisplay>

                                                <h:message id="errComments"
                                                           for="commentsTextarea"
                                                           styleClass="contentText"
                                                           style="color:red;"/>
                                            </h:panelGrid>

                                        </td>
                                    </tr>
                                </table>


                                <!-- Button Panel -->
                                <table cellspacing="0" cellpadding="1" border="0" width="100%">
                                    <tr>
                                        <td><img src="images/spacer.gif" width="1" height="10" alt="spacer"/></td>
                                    </tr>
                                </table>

                                <table cellspacing="0" cellpadding="0" border="0" width="885">
                                    <tr>
                                        <td align="right">
                                            <h:panelGrid columns="2">

                                                <hx:commandExButton id="saveButton"
                                                                    type="submit"
                                                                    value="Save"
                                                                    styleClass="pagebutton"
                                                                    onmouseover="this.className='pagebuttonHL';"
                                                                    onmouseout="this.className='pagebutton';"
                                                                    action="#{pc_DocumentDetail.doSaveButtonAction}"
                                                                    rendered="#{pc_DocumentDetail.documentEditable}"
                                                                    onclick="return checkFileExtension(this, 'Saving Information for Document: #{pc_DocumentDetail.document.documentName} . . .', document.getElementById('documentForm:fileupload1'))"/>

                                                <hx:commandExButton id="cancelButton"
                                                                    type="submit"
                                                                    value="Cancel"
                                                                    styleClass="pagebutton"
                                                                    onmouseover="this.className='pagebuttonHL';"
                                                                    onmouseout="this.className='pagebutton';"
                                                                    action="#{pc_DocumentDetail.doCancelButtonAction}"
                                                                    immediate="true"
                                                                    onclick="showProgress(this,'Processing . . .')"/>

                                            </h:panelGrid>
                                        </td>
                                    </tr>
                                </table>

                            </div>

                        </h:form>

                    </hx:scriptCollector>
                </div>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td colspan="2">
                <ui:include src="mainFooter.xhtml"/>
            </td>
        </tr>

    </table>
</f:view>
</body>

</html>