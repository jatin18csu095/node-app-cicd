<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:h="http://xmlns.jcp.org/jsf/html"
      xmlns:f="http://xmlns.jcp.org/jsf/core"
      xmlns:ui="http://xmlns.jcp.org/jsf/facelets"
      xmlns:hx="http://www.ibm.com/jsf/html_extended"
      xmlns:spocs="WEB-INF/tld/spocs-components.tld">

<h:head>
    <!-- meta / headers -->
    <meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-1" />
    <meta name="GENERATOR" content="IBM Software Development Platform" />
    <meta http-equiv="Content-Style-Type" content="text/css" />

    <title>Document Information</title>

    <!-- styles -->
    <link rel="stylesheet" type="text/css" href="css/global.css" title="Style" />
    <link rel="stylesheet" type="text/css" href="theme/stylesheet.css" title="Style" />

    <!-- scripts -->
    <script type="text/javascript" src="js/global_combined.js"></script>
    <script type="text/javascript" src="js/CalendarPopup.js"></script>

    <script type="text/javascript">
        function onPageLoad() {
            history.forward();
            doOnPageLoad();
        }
    </script>

    <script type="text/javascript">
        function doOnPageLoad() {
            // originally empty in JSP
        }
    </script>
</h:head>

<h:body class="XNoScroll"
        onload="onPageLoad()"
        style="Scrollbar-face-color:#bcd5f8;">

    <f:view>

        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <!-- header -->
            <tr>
                <td colspan="2">
                    <!-- JSP: <%@ include file="mainHeader.jspf" %> -->
                    <ui:include src="mainHeader.xhtml" />
                </td>
            </tr>

            <tr>
                <!-- left sidebar -->
                <td valign="top">
                    <!-- JSP: <%@ include file="mainSidebar.jspf" %> -->
                    <ui:include src="mainSidebar.xhtml" />
                </td>

                <!-- main content -->
                <td valign="top">
                    <hx:scriptCollector id="scriptCollector1">

                        <!-- global messages -->
                        <h:messages id="messages"
                                    styleClass="contentText"
                                    style="color: red;"
                                    layout="table" />

                        <h:form id="documentForm"
                                styleClass="form"
                                enctype="multipart/form-data">

                            <!-- Page Header Table -->
                            <table cellspacing="0" cellpadding="0" border="0" width="885">
                                <tr>
                                    <td>
                                        <img src="images/spacer.gif" width="1" height="8" alt="spacer" border="0" />
                                    </td>
                                </tr>

                                <tr>
                                    <td class="breadcrumb">
                                        <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td class="breadcrumbTEXTwhite" width="100%">
                                                    <img src="images/spacer.gif" width="5" height="1" alt="spacer" border="0" />
                                                    <h:outputFormat id="textPolicyInfo"
                                                                    value="Document Information for Case {0}">
                                                        <f:param value="#{pc_DocumentDetail.document.caseNumber}" />
                                                    </h:outputFormat>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <tr>
                                    <td>
                                        <img src="images/spacer.gif" width="1" height="5" alt="spacer" border="0" />
                                    </td>
                                </tr>
                            </table>
                            <!-- End Page Header Table -->

                            <!-- progress + content section -->
                            <div id="progress"
                                 style="display:none; height:430px; width:885px; overflow:auto; text-align:center"></div>

                            <div id="contentSection"
                                 style="display:block; height:430px; width:100%; overflow:auto;">

                                <table class="viewTableBorder"
                                       cellspacing="0" cellpadding="1" border="0" width="885">
                                    <tr>
                                        <td>

                                            <!-- File Panel -->
                                            <h:panelGrid id="filePanel"
                                                         styleClass="panelGrid"
                                                         columns="1">

                                                <h:outputText id="filePanelLabel"
                                                              styleClass="inputheaderB"
                                                              value="Attach Document" />

                                                <!-- upload visible -->
                                                <h:panelGrid id="fileUploadPanel"
                                                             rendered="#{pc_DocumentDetail.fileUploadPanelShown}">
                                                    <spocs:fileUpload id="fileupload1"
                                                                      styleClass="contentText"
                                                                      value="#{pc_DocumentDetail.fileUploadBean}" />
                                                </h:panelGrid>

                                                <!-- upload hidden → show download link -->
                                                <h:panelGrid id="fileUploadPanel2"
                                                             rendered="#{!pc_DocumentDetail.fileUploadPanelShown}">
                                                    <h:outputLink value="#{pc_DocumentDetail.downloadUrl}">
                                                        <h:outputFormat styleClass="contentText" value="View {0}">
                                                            <f:param value="#{pc_DocumentDetail.document.documentName}" />
                                                        </h:outputFormat>
                                                    </h:outputLink>
                                                </h:panelGrid>

                                            </h:panelGrid>


                                            <!-- Added Date / Added By -->
                                            <h:panelGrid id="addedPanel"
                                                         styleClass="panelGrid"
                                                         columns="2"
                                                         width="700px">

                                                <h:panelGrid id="dateAddedPanel"
                                                             styleClass="panelGrid"
                                                             columns="1">
                                                    <h:outputText id="dateAddedLabel"
                                                                  styleClass="inputheaderB"
                                                                  value="Date Added" />
                                                    <h:outputText id="dateAddedValue"
                                                                  styleClass="contentText"
                                                                  value="#{pc_DocumentDetail.document.createdDate}">
                                                        <f:convertDateTime pattern="MM/dd/yyyy" />
                                                    </h:outputText>
                                                </h:panelGrid>

                                                <h:panelGrid id="addedByPanel"
                                                             styleClass="panelGrid"
                                                             columns="1">
                                                    <h:outputText id="addedByLabel"
                                                                  styleClass="inputheaderB"
                                                                  value="Added By" />
                                                    <h:outputText id="addedByValue"
                                                                  styleClass="contentText"
                                                                  value="#{pc_DocumentDetail.document.createdBy}" />
                                                </h:panelGrid>

                                            </h:panelGrid>


                                            <!-- Comments Panel -->
                                            <h:panelGrid id="commentsPanel"
                                                         styleClass="panelGrid">

                                                <h:panelGrid columns="2">
                                                    <h:outputText styleClass="inputheaderB"
                                                                  value="Comments" />

                                                    <h:panelGroup id="commentIcons"
                                                                  rendered="#{pc_DocumentDetail.document.fieldRules.commentsEditable}">
                                                        <h:graphicImage id="toggleImage"
                                                                        alt="Expand"
                                                                        value="images/open_arrow.gif"
                                                                        onclick="return toggleCommentExpandCollapse(this, 'documentForm:commentsTextarea', '300px', '600px', '50px', '400px');" />

                                                        <h:graphicImage id="commentSpellCheck"
                                                                        alt="Spell Check"
                                                                        value="images/SpellCheck.jpg"
                                                                        onclick="return fDoSpellCheck('documentForm:commentsTextarea', 'Comment');" />
                                                    </h:panelGroup>

                                                    <h:outputText id="fillerText001"
                                                                  value=""
                                                                  rendered="#{!pc_DocumentDetail.document.fieldRules.commentsEditable}" />
                                                </h:panelGrid>

                                                <!-- editable vs read-only view -->
                                                <spocs:alternateDisplay
                                                        condition="#{pc_DocumentDetail.document.fieldRules.commentsEditable}"
                                                        value="true">

                                                    <h:inputTextarea id="commentsTextarea"
                                                                     styleClass="contentText"
                                                                     style="width:500px; height:100px;Scrollbar-face-color:#bcd5f8;"
                                                                     value="#{pc_DocumentDetail.document.comment}">
                                                        <f:validateLength maximum="500" />
                                                    </h:inputTextarea>

                                                    <h:outputText id="commentsTextarea_2"
                                                                  styleClass="contentText showLineBreak"
                                                                  value="#{pc_DocumentDetail.formattedComment}"
                                                                  escape="true" />
                                                </spocs:alternateDisplay>

                                                <h:message id="errComments"
                                                           for="commentsTextarea"
                                                           styleClass="contentText"
                                                           style="color: red;" />

                                            </h:panelGrid>

                                        </td>
                                    </tr>
                                </table>

                                <!-- spacer -->
                                <table cellspacing="0" cellpadding="1" border="0" width="100%">
                                    <tr>
                                        <td>
                                            <img src="images/spacer.gif" width="1" height="10" alt="spacer" border="0" />
                                        </td>
                                    </tr>
                                </table>

                                <!-- Buttons row -->
                                <table cellspacing="0" cellpadding="0" border="0" width="885">
                                    <tr>
                                        <td align="right">
                                            <h:panelGrid columns="2">

                                                <!-- Save -->
                                                <hx:commandExButton id="saveButton"
                                                                    type="submit"
                                                                    value="Save"
                                                                    styleClass="pagebutton"
                                                                    onmouseover="this.className='pagebuttonHL';"
                                                                    onmouseout="this.className='pagebutton';"
                                                                    action="#{pc_DocumentDetail.doSaveButtonAction}"
                                                                    rendered="#{pc_DocumentDetail.documentEditable}"
                                                                    onclick="return checkFileExtension(this, 'Saving Information for Document: #{pc_DocumentDetail.document.documentName} . . .', document.getElementById('documentForm:fileupload1'))" />

                                                <!-- Cancel -->
                                                <hx:commandExButton id="cancelButton"
                                                                    type="submit"
                                                                    value="Cancel"
                                                                    styleClass="pagebutton"
                                                                    onmouseover="this.className='pagebuttonHL';"
                                                                    onmouseout="this.className='pagebutton';"
                                                                    action="#{pc_DocumentDetail.doCancelButtonAction}"
                                                                    onclick="showProgress(this, 'Processing . . .')"
                                                                    immediate="true" />

                                            </h:panelGrid>
                                        </td>
                                    </tr>
                                </table>

                            </div> <!-- /contentSection -->

                        </h:form>

                    </hx:scriptCollector>
                </td>
            </tr>

            <!-- footer -->
            <tr>
                <td colspan="2">
                    <!-- JSP: <%@ include file="mainFooter.jspf" %> -->
                    <ui:include src="mainFooter.xhtml" />
                </td>
            </tr>

        </table>

    </f:view>
</h:body>

</html>